import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { Device } from "@/types";

/** Clave con la que el dispositivo se autentica en el header X-Device-Key (HU-05). */
export function generateDeviceKey(): string {
  return `rv_${randomBytes(24).toString("hex")}`;
}

export async function getDevicesByStore(storeId: string): Promise<Device[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("devices")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
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
    .eq("is_active", true)
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
