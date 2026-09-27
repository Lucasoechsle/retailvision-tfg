import { guardStoreModule } from "@/lib/auth/guards";
import { CampaignView } from "@/components/campaigns/CampaignView";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Promociones" };

export default async function PromosPage({
  params,
}: {
  params: { storeId: string };
}) {
  const guard = await guardStoreModule(params.storeId, "promos");
  if (guard.denied) return guard.denied;
  const { store } = guard;

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
