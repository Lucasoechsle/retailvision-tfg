import { guardStoreModule } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { StoreDevicesView } from "@/components/devices/StoreDevicesView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dispositivos" };

export default async function StoreDevicesPage({
  params,
}: {
  params: { storeId: string };
}) {
  const guard = await guardStoreModule(params.storeId, "devices");
  if (guard.denied) return guard.denied;
  const { store } = guard;

  const supabase = createClient();

  const { data: devices } = await supabase
    .from("devices")
    .select("*")
    .eq("store_id", params.storeId)
    .eq("is_active", true)
    .order("name");

  return <StoreDevicesView store={store} devices={devices || []} />;
}
