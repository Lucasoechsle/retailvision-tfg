import { guardStoreModule } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ConversionView } from "@/components/conversion/ConversionView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conversión" };

export default async function ConversionPage({
  params,
}: {
  params: { storeId: string };
}) {
  const guard = await guardStoreModule(params.storeId, "conversion");
  if (guard.denied) return guard.denied;
  const { store } = guard;

  const supabase = createClient();

  const [{ data: transactions }, { data: summaries }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("store_id", params.storeId)
      .order("timestamp", { ascending: false })
      .limit(50),
    supabase
      .from("daily_store_summaries")
      .select("total_visitors, total_transactions, total_revenue")
      .eq("store_id", params.storeId),
  ]);

  // Totales agregados del histórico para calcular la conversión real
  const stats = (summaries || []).reduce(
    (acc, d) => ({
      totalVisitors: acc.totalVisitors + (d.total_visitors || 0),
      totalTransactions: acc.totalTransactions + (d.total_transactions || 0),
      totalRevenue: acc.totalRevenue + Number(d.total_revenue || 0),
    }),
    { totalVisitors: 0, totalTransactions: 0, totalRevenue: 0 }
  );

  return (
    <ConversionView store={store} transactions={transactions || []} stats={stats} />
  );
}
