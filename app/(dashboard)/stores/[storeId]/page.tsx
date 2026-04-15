import { notFound } from "next/navigation";
import { getStoreById } from "@/lib/data/stores";
import { getDevicesByStore } from "@/lib/data/devices";
import { getZonesByStore } from "@/lib/data/zones";
import { getHourlyTraffic, getRecentCounts } from "@/lib/data/analytics";
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

  const [devices, zones, hourlyTraffic, recentCounts] = await Promise.all([
    getDevicesByStore(params.storeId),
    getZonesByStore(params.storeId),
    getHourlyTraffic(params.storeId, 7),
    getRecentCounts(params.storeId, 1),
  ]);

  const currentInside = recentCounts[0]?.current_inside || 0;

  return (
    <StoreDetail
      store={store}
      devices={devices}
      zones={zones}
      hourlyTraffic={hourlyTraffic}
      currentInside={currentInside}
    />
  );
}
