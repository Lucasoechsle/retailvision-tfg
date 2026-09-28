import { createClient } from "@/lib/supabase/server";
import { occupancyThreshold } from "@/lib/alerts/present";
import { dayRange, localDate } from "@/lib/dates";
import type { StoreOccupancy } from "@/lib/occupancy";

/**
 * HU-09: ocupación actual, entradas y salidas del día y aforo máximo de una tienda.
 * El aforo es el que se configura con la regla de alerta de ocupación (HU-21); si hay
 * varias activas, se toma la más exigente.
 */
export async function getStoreOccupancy(storeId: string, timeZone: string): Promise<StoreOccupancy> {
  const supabase = createClient();
  const today = localDate(new Date(), timeZone);
  const range = dayRange(today, today, timeZone);

  const [latestRes, todayRes, rulesRes] = await Promise.all([
    supabase
      .from("people_counts")
      .select("current_inside, timestamp")
      .eq("store_id", storeId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Totales del día ya agregados en la base (sin el límite de filas de la API)
    supabase.rpc("get_traffic_hourly", {
      p_store_id: storeId,
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
      p_tz: timeZone,
    }),
    supabase
      .from("alert_rules")
      .select("config")
      .eq("store_id", storeId)
      .eq("rule_type", "occupancy")
      .eq("is_active", true),
  ]);

  const rows: any[] = todayRes.data || [];
  const thresholds = (rulesRes.data || [])
    .map((r) => occupancyThreshold(r.config))
    .filter((v) => Number.isFinite(v) && v > 0);

  return {
    current_inside: latestRes.data?.current_inside ?? 0,
    updated_at: latestRes.data?.timestamp ?? null,
    today: {
      date: today,
      entries: rows.reduce((s, r) => s + Number(r.entries), 0),
      exits: rows.reduce((s, r) => s + Number(r.exits), 0),
    },
    max_capacity: thresholds.length > 0 ? Math.min(...thresholds) : null,
  };
}
