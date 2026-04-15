import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ShelfGridView } from "@/components/shelves/ShelfGridView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Análisis de Góndolas" };

export default async function ShelvesPage({
  params,
}: {
  params: { storeId: string };
}) {
  const supabase = createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("id", params.storeId)
    .single();

  if (!store) notFound();

  const { data: gondolaZones } = await supabase
    .from("zones")
    .select("id, name, zone_type, polygon, color")
    .eq("store_id", params.storeId)
    .eq("zone_type", "gondola")
    .eq("is_active", true);

  const zones = gondolaZones || [];
  const gondolaIds = zones.map((z) => z.id);

  let grids: any[] = [];
  let heatmaps: any[] = [];

  if (gondolaIds.length > 0) {
    const { data: g } = await supabase
      .from("shelf_grids")
      .select("*")
      .in("zone_id", gondolaIds);
    grids = g || [];

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data: h } = await supabase
      .from("shelf_heatmaps")
      .select("*")
      .eq("store_id", params.storeId)
      .in("zone_id", gondolaIds)
      .gte("timestamp", since.toISOString())
      .order("timestamp", { ascending: false })
      .limit(200);
    heatmaps = h || [];
  }

  const aggregated = zones.map((zone) => {
    const zoneHeatmaps = heatmaps.filter((h: any) => h.zone_id === zone.id);
    const grid = grids.find((g: any) => g.zone_id === zone.id);

    if (zoneHeatmaps.length === 0) {
      return { zone, grid: grid || null, latest: null, avg_grid: null, sample_count: 0 };
    }

    const latest = zoneHeatmaps[0].grid_data;
    const rows = latest.length;
    const cols = rows > 0 ? latest[0].length : 0;

    const avgGrid: number[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(0)
    );

    for (const hm of zoneHeatmaps) {
      for (let r = 0; r < Math.min(rows, hm.grid_data.length); r++) {
        for (let c = 0; c < Math.min(cols, hm.grid_data[r].length); c++) {
          avgGrid[r][c] += hm.grid_data[r][c];
        }
      }
    }

    const maxVal = Math.max(...avgGrid.flat(), 1);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        avgGrid[r][c] = parseFloat((avgGrid[r][c] / maxVal).toFixed(3));
      }
    }

    return { zone, grid: grid || null, latest, avg_grid: avgGrid, sample_count: zoneHeatmaps.length };
  });

  return <ShelfGridView store={store} aggregated={aggregated} />;
}
