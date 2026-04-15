import { createClient } from "@/lib/supabase/server";
import type { Zone, ZoneWithStats } from "@/types";

export async function getZonesByStore(storeId: string): Promise<Zone[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("zones")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.warn("[zones] getZonesByStore error:", error.message);
    return [];
  }
  return data || [];
}

export async function getZoneWithStats(zoneId: string): Promise<ZoneWithStats | null> {
  const supabase = createClient();

  const { data: zone } = await supabase
    .from("zones")
    .select("*")
    .eq("id", zoneId)
    .single();

  if (!zone) return null;

  const today = new Date().toISOString().split("T")[0];

  const { data: todaySummary } = await supabase
    .from("daily_zone_summaries")
    .select("*")
    .eq("zone_id", zoneId)
    .eq("date", today)
    .single();

  return {
    ...zone,
    total_visits_today: todaySummary?.total_visits || 0,
    avg_dwell_seconds: todaySummary?.avg_dwell_seconds || null,
    engagement_rate: todaySummary?.engagement_rate || null,
    current_occupancy: 0,
  };
}
