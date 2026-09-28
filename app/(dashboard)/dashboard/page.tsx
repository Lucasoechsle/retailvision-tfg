import { redirect } from "next/navigation";
import { getAccessibleStores, getSession } from "@/lib/auth/session";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { createClient } from "@/lib/supabase/server";
import { localDate, localMidnight, storeTimeZone } from "@/lib/dates";
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
    // "Hoy" de cada sucursal, en su zona horaria
    const todayByStore = new Map(stores.map((s) => [s.id, localDate(new Date(), storeTimeZone(s))]));
    const todays = Array.from(new Set(todayByStore.values()));

    const [devicesRes, summariesRes, alertsRes, campaignsRes, latestCounts] = await Promise.all([
      supabase.from("devices").select("status").in("store_id", storeIds).eq("is_active", true),
      supabase
        .from("daily_store_summaries")
        .select("store_id, date, total_visitors, total_transactions, conversion_rate")
        .in("store_id", storeIds)
        .in("date", todays),
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

    const summaries = (summariesRes.data || []).filter((s) => todayByStore.get(s.store_id) === s.date);
    if (summaries.length > 0) {
      totalVisitorsToday = summaries.reduce((s, d) => s + (d.total_visitors || 0), 0);
      const totalTx = summaries.reduce((s, d) => s + (d.total_transactions || 0), 0);
      if (totalVisitorsToday > 0 && totalTx > 0) {
        conversionRate = parseFloat(((totalTx / totalVisitorsToday) * 100).toFixed(1));
      }
    }

    if (totalVisitorsToday === 0) {
      const counts = await Promise.all(
        stores.map((s) =>
          supabase
            .from("people_counts")
            .select("entries")
            .eq("store_id", s.id)
            .gte("timestamp", localMidnight(todayByStore.get(s.id)!, storeTimeZone(s)).toISOString())
        )
      );
      totalVisitorsToday = counts.reduce(
        (sum, res) => sum + (res.data || []).reduce((s, c) => s + (c.entries || 0), 0),
        0
      );
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
