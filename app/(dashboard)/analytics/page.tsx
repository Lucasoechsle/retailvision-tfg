import { guardSection } from "@/lib/auth/guards";
import { getAccessibleStores } from "@/lib/auth/session";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const guard = await guardSection("analytics");
  if (guard.denied) return guard.denied;

  const stores = await getAccessibleStores(guard.session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics &amp; Insights</h1>
        <p className="mt-1 text-muted-foreground">
          Insights automáticos, predicciones y recomendaciones
        </p>
      </div>
      <AnalyticsOverview stores={stores} />
    </div>
  );
}
