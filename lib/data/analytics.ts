import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE, localHour } from "@/lib/dates";
import type { HourlyTraffic, DailyStoreSummary, DailyZoneSummary, PeopleCount } from "@/types";

export async function getHourlyTraffic(
  storeId: string,
  days: number = 7,
  timeZone: string = DEFAULT_TIMEZONE
): Promise<HourlyTraffic[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_hourly_traffic", {
    p_store_id: storeId,
    p_days: days,
  });

  if (error) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: counts } = await supabase
      .from("people_counts")
      .select("timestamp, entries, exits")
      .eq("store_id", storeId)
      .gte("timestamp", since.toISOString())
      .order("timestamp");

    if (!counts || counts.length === 0) return [];

    const hourMap = new Map<number, { entries: number[]; exits: number[] }>();
    for (const c of counts) {
      const hour = localHour(new Date(c.timestamp), timeZone);
      if (!hourMap.has(hour)) hourMap.set(hour, { entries: [], exits: [] });
      hourMap.get(hour)!.entries.push(c.entries);
      hourMap.get(hour)!.exits.push(c.exits);
    }

    return Array.from(hourMap.entries())
      .map(([hour, data]) => ({
        hour,
        entries: Math.round(data.entries.reduce((a, b) => a + b, 0) / data.entries.length),
        exits: Math.round(data.exits.reduce((a, b) => a + b, 0) / data.exits.length),
      }))
      .sort((a, b) => a.hour - b.hour);
  }

  return (data || []).map((d: any) => ({
    hour: d.hour,
    entries: Math.round(d.avg_entries || 0),
    exits: Math.round(d.avg_exits || 0),
  }));
}

export async function getDailyStoreSummaries(
  storeId: string,
  days: number = 30
): Promise<DailyStoreSummary[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("daily_store_summaries")
    .select("*")
    .eq("store_id", storeId)
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (error) {
    console.warn("[analytics] getDailyStoreSummaries error:", error.message);
    return [];
  }
  return data || [];
}

export async function getDailyZoneSummaries(
  storeId: string,
  days: number = 30
): Promise<DailyZoneSummary[]> {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("daily_zone_summaries")
    .select("*")
    .eq("store_id", storeId)
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (error) {
    console.warn("[analytics] getDailyZoneSummaries error:", error.message);
    return [];
  }
  return data || [];
}

export async function getRecentCounts(
  storeId: string,
  limit: number = 288
): Promise<PeopleCount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("people_counts")
    .select("*")
    .eq("store_id", storeId)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[analytics] getRecentCounts error:", error.message);
    return [];
  }
  return data || [];
}

export async function getZoneRankings(storeId: string, dateFrom?: string, dateTo?: string) {
  const supabase = createClient();
  const from = dateFrom || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const to = dateTo || new Date().toISOString().split("T")[0];

  const { data, error } = await supabase.rpc("get_zone_rankings", {
    p_store_id: storeId,
    p_date_from: from,
    p_date_to: to,
  });

  if (error) return [];
  return data || [];
}

export async function comparePeriods(
  storeId: string,
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string
) {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("compare_periods", {
    p_store_id: storeId,
    p_current_start: currentStart,
    p_current_end: currentEnd,
    p_previous_start: previousStart,
    p_previous_end: previousEnd,
  });

  if (error) return [];
  return data || [];
}
