import { guardStoreModule } from "@/lib/auth/guards";
import { TemporalAnalyticsView } from "@/components/temporal/TemporalAnalyticsView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics Temporales" };

export default async function TemporalPage({
  params,
}: {
  params: { storeId: string };
}) {
  const guard = await guardStoreModule(params.storeId, "temporal");
  if (guard.denied) return guard.denied;
  const { store } = guard;

  return <TemporalAnalyticsView store={store} storeId={params.storeId} />;
}
