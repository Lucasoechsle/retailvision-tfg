import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TemporalAnalyticsView } from "@/components/temporal/TemporalAnalyticsView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics Temporales" };

export default async function TemporalPage({
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

  return <TemporalAnalyticsView store={store} storeId={params.storeId} />;
}
