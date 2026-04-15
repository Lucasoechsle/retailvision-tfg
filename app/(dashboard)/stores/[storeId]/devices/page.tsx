import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { StoreDevicesView } from "@/components/devices/StoreDevicesView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dispositivos" };

export default async function StoreDevicesPage({
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

  const { data: devices } = await supabase
    .from("devices")
    .select("*")
    .eq("store_id", params.storeId)
    .order("name");

  return <StoreDevicesView store={store} devices={devices || []} />;
}
