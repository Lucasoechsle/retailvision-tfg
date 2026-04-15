import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const storeId = params.storeId;
  const url = new URL(request.url);
  const hoursBack = parseInt(url.searchParams.get("hours") || "24", 10);

  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const [currentRes, historyRes, zonesRes] = await Promise.all([
    supabase
      .from("queue_snapshots")
      .select("*")
      .eq("store_id", storeId)
      .gte("timestamp", new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order("timestamp", { ascending: false }),

    supabase.rpc("get_queue_history", {
      p_store_id: storeId,
      p_start: since,
      p_end: new Date().toISOString(),
    }),

    supabase
      .from("zones")
      .select("id, name, zone_type, color")
      .eq("store_id", storeId)
      .in("zone_type", ["checkout", "caja", "queue"])
      .eq("is_active", true),
  ]);

  const checkoutZones = zonesRes.data || [];
  const zoneMap: Record<string, string> = {};
  checkoutZones.forEach((z) => { zoneMap[z.id] = z.name; });

  const latestSnapshots = currentRes.data || [];
  const seenZones = new Set<string>();
  const currentQueues = latestSnapshots
    .filter((s) => {
      if (seenZones.has(s.zone_id)) return false;
      seenZones.add(s.zone_id);
      return true;
    })
    .map((s) => ({
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

  const totalPeopleInQueue = currentQueues.reduce((s, q) => s + q.people_in_queue, 0);
  const avgWait = currentQueues.length > 0
    ? currentQueues.reduce((s, q) => s + q.estimated_wait_seconds, 0) / currentQueues.length
    : 0;

  return NextResponse.json({
    metrics: {
      total_checkout_zones: checkoutZones.length,
      total_people_in_queue: totalPeopleInQueue,
      avg_wait_seconds: Math.round(avgWait),
      open_registers: currentQueues.filter((q) => q.is_open).length,
    },
    current_queues: currentQueues,
    history,
    zones: checkoutZones,
  });
}
