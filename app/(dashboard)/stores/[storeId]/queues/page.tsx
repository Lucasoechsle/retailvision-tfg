import { notFound } from "next/navigation";
import { getStoreById } from "@/lib/data/stores";
import { QueueView } from "@/components/queues/QueueView";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Colas" };

export default async function QueuesPage({
  params,
}: {
  params: { storeId: string };
}) {
  const store = await getStoreById(params.storeId);
  if (!store) notFound();

  const supabase = createClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [currentRes, historyRes, zonesRes] = await Promise.all([
    supabase
      .from("queue_snapshots")
      .select("*")
      .eq("store_id", params.storeId)
      .gte("timestamp", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order("timestamp", { ascending: false }),

    supabase.rpc("get_queue_history", {
      p_store_id: params.storeId,
      p_start: since,
      p_end: new Date().toISOString(),
    }),

    supabase
      .from("zones")
      .select("id, name, zone_type, color")
      .eq("store_id", params.storeId)
      .in("zone_type", ["checkout", "caja", "queue"])
      .eq("is_active", true),
  ]);

  const checkoutZones = zonesRes.data || [];
  const zoneMap: Record<string, string> = {};
  checkoutZones.forEach((z: any) => { zoneMap[z.id] = z.name; });

  const latestSnapshots = currentRes.data || [];
  const seenZones = new Set<string>();
  const currentQueues = latestSnapshots
    .filter((s: any) => {
      if (seenZones.has(s.zone_id)) return false;
      seenZones.add(s.zone_id);
      return true;
    })
    .map((s: any) => ({
      zone_id: s.zone_id,
      zone_name: zoneMap[s.zone_id] || s.zone_id,
      people_in_queue: s.people_in_queue,
      estimated_wait_seconds: s.estimated_wait_seconds,
      is_open: s.is_open,
      timestamp: s.timestamp,
    }));

  const history = (historyRes.data || []).map((h: any) => ({
    hour: h.hour,
    zone_id: h.zone_id,
    zone_name: zoneMap[h.zone_id] || h.zone_id,
    avg_people: h.avg_people,
    max_people: h.max_people,
    avg_wait: h.avg_wait,
  }));

  const totalPeopleInQueue = currentQueues.reduce((s: number, q: any) => s + q.people_in_queue, 0);
  const avgWait = currentQueues.length > 0
    ? currentQueues.reduce((s: number, q: any) => s + q.estimated_wait_seconds, 0) / currentQueues.length
    : 0;

  const data = {
    metrics: {
      total_checkout_zones: checkoutZones.length,
      total_people_in_queue: totalPeopleInQueue,
      avg_wait_seconds: Math.round(avgWait),
      open_registers: currentQueues.filter((q: any) => q.is_open).length,
    },
    current_queues: currentQueues,
    history,
    zones: checkoutZones,
  };

  return <QueueView store={store} data={data} />;
}
