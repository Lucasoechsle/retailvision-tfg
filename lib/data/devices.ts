import { createClient } from "@/lib/supabase/server";
import type { Device } from "@/types";

export async function getDevicesByStore(storeId: string): Promise<Device[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("store_id", storeId)
    .order("name");

  if (error) {
    console.warn("[devices] getDevicesByStore error:", error.message);
    return [];
  }
  return data || [];
}

export async function getDevicesByOrg(orgId: string): Promise<(Device & { store_name: string })[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("devices")
    .select("*, stores!inner(name, organization_id)")
    .eq("stores.organization_id", orgId)
    .order("name");

  if (error) {
    console.warn("[devices] getDevicesByOrg error:", error.message);
    return [];
  }
  return (data || []).map((d: any) => ({
    ...d,
    store_name: d.stores?.name || "",
  }));
}
