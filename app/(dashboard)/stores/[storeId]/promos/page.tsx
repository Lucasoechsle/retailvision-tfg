import { guardStoreModule } from "@/lib/auth/guards";
import { can } from "@/lib/auth/roles";
import { CampaignView } from "@/components/campaigns/CampaignView";
import { createClient } from "@/lib/supabase/server";
import { localDate, storeTimeZone } from "@/lib/dates";
import { campaignStatus } from "@/lib/campaigns";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Promociones" };

export default async function PromosPage({
  params,
}: {
  params: { storeId: string };
}) {
  const guard = await guardStoreModule(params.storeId, "promos");
  if (guard.denied) return guard.denied;
  const { store, session } = guard;

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
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  // El estado de cada campaña depende de sus fechas y del día de hoy en la tienda
  const today = localDate(new Date(), storeTimeZone(store));
  const campaigns = (campaignsRes.data || []).map((c) => ({ ...c, status: campaignStatus(c, today) }));

  return (
    <CampaignView
      store={store}
      campaigns={campaigns}
      zones={zonesRes.data || []}
      canManage={can(session.role, "manage_campaigns")}
    />
  );
}
