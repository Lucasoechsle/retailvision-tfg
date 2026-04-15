import { redirect } from "next/navigation";
import { getCurrentUser, getUserOrgId } from "@/lib/data/auth";
import { getStoresByOrg } from "@/lib/data/stores";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const orgId = await getUserOrgId();
  if (!orgId) redirect("/login");

  const stores = await getStoresByOrg(orgId);
  const storeIds = stores.map((s) => s.id);

  const supabase = createClient();
  const { data: devices } = await supabase
    .from("devices")
    .select("status, stores!inner(organization_id)")
    .eq("stores.organization_id", orgId);

  const deviceList = devices || [];
  const devicesOnline = deviceList.filter((d: any) => d.status === "online").length;

  let totalVisitorsToday = 0;
  let conversionRate: number | null = null;

  if (storeIds.length > 0) {
    const today = new Date().toISOString().split("T")[0];

    const { data: summaries } = await supabase
      .from("daily_store_summaries")
      .select("total_visitors, total_transactions, conversion_rate")
      .in("store_id", storeIds)
      .eq("date", today);

    if (summaries && summaries.length > 0) {
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
      stores={stores}
      devicesOnline={devicesOnline}
      devicesTotal={deviceList.length}
      totalVisitorsToday={totalVisitorsToday}
      conversionRate={conversionRate}
    />
  );
}
