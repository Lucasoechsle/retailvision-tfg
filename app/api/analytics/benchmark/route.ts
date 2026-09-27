import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/auth/api";
import { canAccessSection } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  if (!canAccessSection(auth.session.role, "benchmark")) {
    return NextResponse.json({ error: "Tu perfil no tiene acceso al benchmark" }, { status: 403 });
  }

  const supabase = createClient();
  const profile = { organization_id: auth.session.organizationId };

  const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, address, is_active")
    .eq("organization_id", profile.organization_id)
    .eq("is_active", true)
    .order("name");

  if (!stores || stores.length === 0) {
    return NextResponse.json({ stores: [], benchmark: [] });
  }

  const storeIds = stores.map((s) => s.id);

  const { data: summaries } = await supabase
    .from("daily_store_summaries")
    .select("store_id, date, total_visitors, total_transactions, conversion_rate, avg_dwell_seconds, peak_hour, peak_occupancy")
    .in("store_id", storeIds)
    .gte("date", sinceStr)
    .order("date");

  const { data: devices } = await supabase
    .from("devices")
    .select("store_id, status")
    .in("store_id", storeIds);

  const storeMetrics = stores.map((store) => {
    const storeSummaries = (summaries || []).filter((s) => s.store_id === store.id);
    const storeDevices = (devices || []).filter((d) => d.store_id === store.id);

    const totalVisitors = storeSummaries.reduce((s, d) => s + (d.total_visitors || 0), 0);
    const totalTx = storeSummaries.reduce((s, d) => s + (d.total_transactions || 0), 0);
    const avgDwell = storeSummaries.length > 0
      ? storeSummaries.reduce((s, d) => s + (d.avg_dwell_seconds || 0), 0) / storeSummaries.length
      : 0;
    const avgConversion = storeSummaries.length > 0
      ? storeSummaries.reduce((s, d) => s + (d.conversion_rate || 0), 0) / storeSummaries.length
      : 0;
    const avgDailyVisitors = storeSummaries.length > 0
      ? totalVisitors / storeSummaries.length
      : 0;

    const peakHours = storeSummaries.filter((s) => s.peak_hour != null).map((s) => s.peak_hour);
    const modePeakHour = peakHours.length > 0
      ? peakHours.sort((a, b) =>
          peakHours.filter((v) => v === a).length - peakHours.filter((v) => v === b).length
        ).pop()
      : null;

    const dailyTrend = storeSummaries.map((s) => ({
      date: s.date,
      visitors: s.total_visitors || 0,
      transactions: s.total_transactions || 0,
    }));

    return {
      store_id: store.id,
      store_name: store.name,
      address: store.address,
      days_with_data: storeSummaries.length,
      total_visitors: totalVisitors,
      avg_daily_visitors: Math.round(avgDailyVisitors),
      total_transactions: totalTx,
      avg_conversion_rate: Math.round(avgConversion * 10) / 10,
      avg_dwell_seconds: Math.round(avgDwell),
      peak_hour: modePeakHour,
      devices_online: storeDevices.filter((d) => d.status === "online").length,
      devices_total: storeDevices.length,
      daily_trend: dailyTrend,
    };
  });

  storeMetrics.sort((a, b) => b.total_visitors - a.total_visitors);

  return NextResponse.json({
    stores,
    benchmark: storeMetrics,
    period_days: days,
  });
}
