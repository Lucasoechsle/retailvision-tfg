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

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("store_id", params.storeId)
    .order("timestamp", { ascending: false })
    .limit(50);

  return <ConversionView store={store} transactions={transactions || []} />;
}
