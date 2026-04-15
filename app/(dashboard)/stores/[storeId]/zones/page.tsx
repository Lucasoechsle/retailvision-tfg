import { notFound } from "next/navigation";
import { getStoreById } from "@/lib/data/stores";
import { getZonesByStore } from "@/lib/data/zones";
import { createClient } from "@/lib/supabase/server";
import { ZonesView } from "@/components/zones/ZonesView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Zonas" };

export default async function ZonesPage({
  params,
}: {
  params: { storeId: string };
}) {
  const store = await getStoreById(params.storeId);
  if (!store) notFound();

  const zones = await getZonesByStore(params.storeId);

  const supabase = createClient();
  const { data: floorPlan } = await supabase
    .from("floor_plans")
    .select("*")
    .eq("store_id", params.storeId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return <ZonesView store={store} zones={zones} floorPlan={floorPlan} />;
}
