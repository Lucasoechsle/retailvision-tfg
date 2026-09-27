import { guardStoreModule } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { HeatmapView } from "@/components/heatmap/HeatmapView";
import { isHeatmapSlot, slotWindow, sumGrids } from "@/lib/heatmap";
import { isIsoDate, localDate } from "@/lib/dates";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mapa de Calor" };

export default async function HeatmapPage({
  params,
  searchParams,
}: {
  params: { storeId: string };
  searchParams: { date?: string; slot?: string };
}) {
  const guard = await guardStoreModule(params.storeId, "heatmap");
  if (guard.denied) return guard.denied;
  const { store } = guard;

  const supabase = createClient();
  const timeZone = store.timezone || "America/Argentina/Cordoba";

  // HU-14: el gerente elige fecha y franja horaria; por defecto, el último día con datos
  let date = isIsoDate(searchParams.date) ? searchParams.date : null;
  if (!date) {
    const { data: latest } = await supabase
      .from("zone_heatmaps")
      .select("timestamp")
      .eq("store_id", params.storeId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();
    date = localDate(latest ? new Date(latest.timestamp) : new Date(), timeZone);
  }
  const slot = isHeatmapSlot(searchParams.slot) ? searchParams.slot : "all";
  const { from, to } = slotWindow(date, slot, timeZone);

  const [heatmapsRes, floorPlanRes, zonesRes] = await Promise.all([
    supabase
      .from("zone_heatmaps")
      .select("heatmap_data")
      .eq("store_id", params.storeId)
      .gte("timestamp", from.toISOString())
      .lt("timestamp", to.toISOString()),
    supabase
      .from("floor_plans")
      .select("*")
      .eq("store_id", params.storeId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("zones")
      .select("id, name, zone_type, polygon, color")
      .eq("store_id", params.storeId)
      .eq("is_active", true),
  ]);

  const snapshots = heatmapsRes.data || [];

  return (
    <HeatmapView
      store={store}
      date={date}
      slot={slot}
      grid={sumGrids(snapshots.map((h) => h.heatmap_data as number[][]))}
      snapshots={snapshots.length}
      floorPlan={floorPlanRes.data || null}
      zones={zonesRes.data || []}
    />
  );
}
