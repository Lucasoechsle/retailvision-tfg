import { guardStoreModule } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ConversionView } from "@/components/conversion/ConversionView";
import { addDays, localDate } from "@/lib/dates";
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
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("store_id", params.storeId)
    .order("timestamp", { ascending: false })
    .limit(50);

  // Período inicial: los 30 días que terminan en la última transacción registrada
  const timeZone = store.timezone || "America/Argentina/Cordoba";
  const latest = transactions?.[0] ? new Date(transactions[0].timestamp) : new Date();
  const to = localDate(latest, timeZone);

  return (
    <ConversionView
      store={store}
      transactions={transactions || []}
      initialRange={{ from: addDays(to, -29), to }}
    />
  );
}
