import { notFound } from "next/navigation";
import { getStoreById } from "@/lib/data/stores";
import { CampaignView } from "@/components/campaigns/CampaignView";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Promociones" };

export default async function PromosPage({
  params,
}: {
  params: { storeId: string };
}) {
  const store = await getStoreById(params.storeId);
  if (!store) notFound();

  const supabase = createClient();

  const [campaignsRes, zonesRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*, zones(id, name, color)")
      .eq("store_id", params.storeId)
      .order("start_date", { ascending: false }),
    supabase
      .from("zones")
      .select("id, name, color")
      .eq("store_id", params.storeId)
      .eq("is_active", true),
  ]);

  return (
    <CampaignView
      store={store}
      campaigns={campaignsRes.data || []}
      zones={zonesRes.data || []}
    />
  );
}
