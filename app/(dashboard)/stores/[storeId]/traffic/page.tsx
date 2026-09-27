import { guardStoreModule } from "@/lib/auth/guards";
import { getRecentCounts } from "@/lib/data/analytics";
import { TrafficView } from "@/components/traffic/TrafficView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tráfico" };

export default async function TrafficPage({
  params,
}: {
  params: { storeId: string };
}) {
  const guard = await guardStoreModule(params.storeId, "traffic");
  if (guard.denied) return guard.denied;
  const { store } = guard;

  const counts = await getRecentCounts(params.storeId, 288);

  return <TrafficView store={store} counts={counts} />;
}
