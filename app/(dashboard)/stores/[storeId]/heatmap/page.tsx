import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { HeatmapView } from "@/components/heatmap/HeatmapView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mapa de Calor" };

export default async function HeatmapPage({
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

  const [heatmapsRes, floorPlanRes, zonesRes] = await Promise.all([
    supabase
      .from("zone_heatmaps")
      .select("*")
      .eq("store_id", params.storeId)
      .order("timestamp", { ascending: false })
      .limit(24),
    supabase
      .from("floor_plans")
      .select("*")
      .eq("store_id", params.storeId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("zones")
      .select("id, name, zone_type, polygon, color")
      .eq("store_id", params.storeId)
      .eq("is_active", true),
  ]);

  return (
    <HeatmapView
      store={store}
      heatmaps={heatmapsRes.data || []}
      floorPlan={floorPlanRes.data || null}
      zones={zonesRes.data || []}
    />
  );
}
