import { createClient } from "@/lib/supabase/server";
import type { Store, StoreWithStats } from "@/types";

export async function getStoresByOrg(orgId: string): Promise<Store[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");

  if (error) throw error;
  return data || [];
}

export async function getStoreById(storeId: string): Promise<Store | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (error) return null;
  return data;
}

export async function getStoreWithStats(storeId: string): Promise<StoreWithStats | null> {
  const supabase = createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("id", storeId)
    .single();

  if (!store) return null;

  const today = new Date().toISOString().split("T")[0];

  const { data: todaySummary } = await supabase
    .from("daily_store_summaries")
    .select("*")
    .eq("store_id", storeId)
    .eq("date", today)
    .single();

  const { data: devices } = await supabase
    .from("devices")
    .select("status")
    .eq("store_id", storeId);

  const devicesOnline = devices?.filter((d) => d.status === "online").length || 0;

  const { data: latestCount } = await supabase
    .from("people_counts")
    .select("current_inside")
    .eq("store_id", storeId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .single();

  return {
    ...store,
    total_visitors_today: todaySummary?.total_visitors || 0,
    current_inside: latestCount?.current_inside || 0,
    devices_online: devicesOnline,
    devices_total: devices?.length || 0,
    conversion_rate: todaySummary?.conversion_rate || null,
  };
}
