import { getStoreById } from "@/lib/data/stores";
import { guardStoreModule } from "@/lib/auth/guards";
import { getDevicesByStore } from "@/lib/data/devices";
import { getZonesByStore } from "@/lib/data/zones";
import { getHourlyTraffic } from "@/lib/data/analytics";
import { getStoreOccupancy } from "@/lib/data/occupancy";
import { createClient } from "@/lib/supabase/server";
import { storeTimeZone } from "@/lib/dates";
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
  const guard = await guardStoreModule(params.storeId, "summary");
  if (guard.denied) return guard.denied;
  const { store, session } = guard;

  const supabase = createClient();

  const timeZone = storeTimeZone(store);
  const occupancyFetchedAt = new Date().toISOString();
  const [devices, zones, hourlyTraffic, occupancy, dwellRes] = await Promise.all([
    getDevicesByStore(params.storeId),
    getZonesByStore(params.storeId),
    getHourlyTraffic(params.storeId, 7, timeZone),
    getStoreOccupancy(params.storeId, timeZone),
    supabase
      .from("daily_zone_summaries")
      .select("avg_dwell_seconds")
      .eq("store_id", params.storeId),
  ]);

  // Dwell time promedio real a partir de los resúmenes diarios por zona
  const dwellVals = (dwellRes.data || [])
    .map((d) => d.avg_dwell_seconds)
    .filter((v): v is number => v != null && v > 0);
  const avgDwellSeconds = dwellVals.length
    ? dwellVals.reduce((a, b) => a + b, 0) / dwellVals.length
    : 0;

  return (
    <StoreDetail
      role={session.role}
      store={store}
      devices={devices}
      zones={zones}
      hourlyTraffic={hourlyTraffic}
      occupancy={occupancy}
      occupancyFetchedAt={occupancyFetchedAt}
      avgDwellSeconds={avgDwellSeconds}
    />
  );
}
