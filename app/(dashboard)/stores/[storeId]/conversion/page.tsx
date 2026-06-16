import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ConversionView } from "@/components/conversion/ConversionView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conversión" };

export default async function ConversionPage({
  params,
}: {
  params: { storeId: string };
}) {
  const supabase = createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("id", params.storeId)
    .single();

  if (!store) notFound();

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
