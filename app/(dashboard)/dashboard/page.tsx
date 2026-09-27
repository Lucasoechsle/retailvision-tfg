import { redirect } from "next/navigation";
import { getAccessibleStores, getSession } from "@/lib/auth/session";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Cada perfil ve el resumen de las sucursales a las que tiene acceso (HU-02)
  const stores = await getAccessibleStores(session);
  const storeIds = stores.map((s) => s.id);

  const supabase = createClient();

  let devicesOnline = 0;
  let devicesTotal = 0;
  let totalVisitorsToday = 0;
  let conversionRate: number | null = null;
  let currentInside = 0;
  let activeAlerts = 0;
  let activeCampaigns = 0;

  if (storeIds.length > 0) {
    const today = new Date().toISOString().split("T")[0];

    const [devicesRes, summariesRes, alertsRes, campaignsRes, latestCounts] = await Promise.all([
      supabase.from("devices").select("status").in("store_id", storeIds).eq("is_active", true),
      supabase
        .from("daily_store_summaries")
        .select("total_visitors, total_transactions, conversion_rate")
        .in("store_id", storeIds)
        .eq("date", today),
      supabase
        .from("alert_events")
        .select("id", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "active"),
      supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", "active"),
      Promise.all(
        storeIds.map((id) =>
          supabase
            .from("people_counts")
            .select("current_inside")
            .eq("store_id", id)
            .order("timestamp", { ascending: false })
            .limit(1)
            .maybeSingle()
        )
      ),
    ]);

    const deviceList = devicesRes.data || [];
    devicesTotal = deviceList.length;
    devicesOnline = deviceList.filter((d) => d.status === "online").length;
    activeAlerts = alertsRes.count || 0;
    activeCampaigns = campaignsRes.count || 0;
    currentInside = latestCounts.reduce((s, r) => s + (r.data?.current_inside || 0), 0);

    const summaries = summariesRes.data || [];
    if (summaries.length > 0) {
      totalVisitorsToday = summaries.reduce((s, d) => s + (d.total_visitors || 0), 0);
      const totalTx = summaries.reduce((s, d) => s + (d.total_transactions || 0), 0);
      if (totalVisitorsToday > 0 && totalTx > 0) {
        conversionRate = parseFloat(((totalTx / totalVisitorsToday) * 100).toFixed(1));
      }
    }

    if (totalVisitorsToday === 0) {
      const startOfDay = `${today}T00:00:00.000Z`;
      const { data: counts } = await supabase
        .from("people_counts")
        .select("entries")
        .in("store_id", storeIds)
        .gte("timestamp", startOfDay);

      if (counts && counts.length > 0) {
        totalVisitorsToday = counts.reduce((s, c) => s + (c.entries || 0), 0);
      }
    }
  }

  return (
    <DashboardOverview
      role={session.role}
      stores={stores}
      metrics={{
        devicesOnline,
        devicesTotal,
        totalVisitorsToday,
        conversionRate,
        currentInside,
        activeAlerts,
        activeCampaigns,
      }}
    />
  );
}
