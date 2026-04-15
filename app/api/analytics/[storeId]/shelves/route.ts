import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getUserOrgId } from "@/lib/data/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { storeId } = params;
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get("zone_id");
  const days = parseInt(searchParams.get("days") || "7", 10);

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: gondolaZones } = await supabase
    .from("zones")
    .select("id, name, zone_type, polygon, color")
    .eq("store_id", storeId)
    .eq("zone_type", "gondola")
    .eq("is_active", true);

  if (!gondolaZones || gondolaZones.length === 0) {
    return NextResponse.json({
      zones: [],
      grids: [],
      heatmaps: [],
      message: "No hay zonas tipo gondola configuradas",
    });
  }

  const gondolaIds = gondolaZones.map((z) => z.id);

  const { data: grids } = await supabase
    .from("shelf_grids")
    .select("*")
    .in("zone_id", gondolaIds);

  let heatmapQuery = supabase
    .from("shelf_heatmaps")
    .select("*")
    .eq("store_id", storeId)
    .gte("timestamp", since.toISOString())
    .order("timestamp", { ascending: false });

  if (zoneId) {
    heatmapQuery = heatmapQuery.eq("zone_id", zoneId);
  } else {
    heatmapQuery = heatmapQuery.in("zone_id", gondolaIds);
  }

  const { data: heatmaps } = await heatmapQuery.limit(200);

  const aggregated = gondolaIds.map((zid) => {
    const zoneHeatmaps = (heatmaps || []).filter((h) => h.zone_id === zid);
    const grid = (grids || []).find((g) => g.zone_id === zid);
    const zone = gondolaZones.find((z) => z.id === zid)!;

    if (zoneHeatmaps.length === 0) {
      return {
        zone,
        grid: grid || null,
        latest: null,
        avg_grid: null,
        sample_count: 0,
      };
    }

    const latest = zoneHeatmaps[0];
    const rows = latest.grid_data.length;
    const cols = rows > 0 ? latest.grid_data[0].length : 0;

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

    return {
      zone,
      grid: grid || null,
      latest: latest.grid_data,
      avg_grid: avgGrid,
      sample_count: zoneHeatmaps.length,
    };
  });

  return NextResponse.json({
    zones: gondolaZones,
    grids: grids || [],
    aggregated,
  });
}
