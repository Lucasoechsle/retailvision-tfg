import { notFound } from "next/navigation";
import { getStoreById } from "@/lib/data/stores";
import { getDevicesByStore } from "@/lib/data/devices";
import { getZonesByStore } from "@/lib/data/zones";
import { getHourlyTraffic, getRecentCounts } from "@/lib/data/analytics";
import { createClient } from "@/lib/supabase/server";
import { StoreDetail } from "@/components/stores/StoreDetail";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: { storeId: string };
}): Promise<Metadata> {
  const store = await getStoreById(params.storeId);
  return { title: store?.name || "Tienda" };
}

export default async function StoreDetailPage({
  params,
}: {
  params: { storeId: string };
}) {
  const store = await getStoreById(params.storeId);
  if (!store) notFound();

  const supabase = createClient();

  const [devices, zones, hourlyTraffic, recentCounts, dwellRes] = await Promise.all([
    getDevicesByStore(params.storeId),
    getZonesByStore(params.storeId),
    getHourlyTraffic(params.storeId, 7),
    getRecentCounts(params.storeId, 1),
    supabase
      .from("daily_zone_summaries")
      .select("avg_dwell_seconds")
      .eq("store_id", params.storeId),
  ]);

  const currentInside = recentCounts[0]?.current_inside || 0;

  // Dwell time promedio real a partir de los resúmenes diarios por zona
  const dwellVals = (dwellRes.data || [])
    .map((d) => d.avg_dwell_seconds)
    .filter((v): v is number => v != null && v > 0);
  const avgDwellSeconds = dwellVals.length
    ? dwellVals.reduce((a, b) => a + b, 0) / dwellVals.length
    : 0;

  return (
    <StoreDetail
      store={store}
      devices={devices}
      zones={zones}
      hourlyTraffic={hourlyTraffic}
      currentInside={currentInside}
      avgDwellSeconds={avgDwellSeconds}
    />
  );
}
