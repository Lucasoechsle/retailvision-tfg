import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  // Valida la organización y, para el gerente de tienda, que la tienda esté a su cargo
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;

  const { storeId } = params;
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const year = parseInt(
    searchParams.get("year") || new Date().getFullYear().toString(),
    10
  );

  const [hourlyResult, dowResult, monthlyResult, trendingResult, calendarResult] =
    await Promise.all([
      supabase.rpc("get_hourly_breakdown", { p_store_id: storeId }),
      supabase.rpc("get_dow_breakdown", { p_store_id: storeId }),
      supabase.rpc("get_monthly_breakdown", { p_store_id: storeId }),
      supabase.rpc("get_zone_trending", { p_store_id: storeId, p_days: 7 }),
      supabase.rpc("get_calendar_data", { p_store_id: storeId, p_year: year }),
    ]);

  const hourly = hourlyResult.data || [];
  const dow = dowResult.data || [];
  const monthly = monthlyResult.data || [];
  const trending = trendingResult.data || [];
  const calendar = calendarResult.data || [];

  const peakHour = hourly.length > 0
    ? hourly.reduce((best: any, h: any) =>
        h.avg_entries > (best?.avg_entries || 0) ? h : best,
      null)
    : null;

  const peakDay = dow.length > 0
    ? dow.reduce((best: any, d: any) =>
        d.avg_visitors > (best?.avg_visitors || 0) ? d : best,
      null)
    : null;

  const dayNames = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const totalVisitorsYear = calendar.reduce(
    (s: number, c: any) => s + (c.total_visitors || 0),
    0
  );

  return NextResponse.json({
    hourly,
    dow: dow.map((d: any) => ({
      ...d,
      day_name: dayNames[d.day_of_week] || `D${d.day_of_week}`,
    })),
    monthly,
    trending,
    calendar,
    summary: {
      peak_hour: peakHour
        ? { hour: peakHour.hour_of_day, avg_entries: peakHour.avg_entries }
        : null,
      peak_day: peakDay
        ? {
            day: peakDay.day_of_week,
            name: dayNames[peakDay.day_of_week],
            avg_visitors: peakDay.avg_visitors,
          }
        : null,
      total_visitors_year: totalVisitorsYear,
      months_with_data: monthly.length,
    },
  });
}
