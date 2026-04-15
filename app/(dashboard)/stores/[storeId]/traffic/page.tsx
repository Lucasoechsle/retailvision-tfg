import { notFound } from "next/navigation";
import { getStoreById } from "@/lib/data/stores";
import { getRecentCounts } from "@/lib/data/analytics";
import { TrafficView } from "@/components/traffic/TrafficView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tráfico" };

export default async function TrafficPage({
  params,
}: {
  params: { storeId: string };
}) {
  const store = await getStoreById(params.storeId);
  if (!store) notFound();

  const counts = await getRecentCounts(params.storeId, 288);

  return <TrafficView store={store} counts={counts} />;
}
