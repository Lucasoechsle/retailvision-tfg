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

  const { data: heatmaps } = await supabase
    .from("zone_heatmaps")
    .select("*")
    .eq("store_id", params.storeId)
    .order("timestamp", { ascending: false })
    .limit(24);

  return <HeatmapView store={store} heatmaps={heatmaps || []} />;
}
