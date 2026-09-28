import { guardStoreModule } from "@/lib/auth/guards";
import { getRecentCounts } from "@/lib/data/analytics";
import { localDate } from "@/lib/dates";
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

  // "Hoy" es la fecha de la tienda, no la del servidor
  const today = localDate(new Date(), store.timezone || "America/Argentina/Cordoba");
  const [latest] = await getRecentCounts(params.storeId, 1);

  return <TrafficView store={store} today={today} latest={latest ?? null} />;
}
