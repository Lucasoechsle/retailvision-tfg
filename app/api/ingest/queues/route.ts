import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestQueuesSchema } from "@/lib/schemas/ingest";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-Device-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key requerida" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, store_id")
    .eq("api_key", apiKey)
    .single();

  if (deviceError || !device) {
    return NextResponse.json({ error: "Device no encontrado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ingestQueuesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await supabase
    .from("devices")
    .update({ status: "online", last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  const timestamp = parsed.data.timestamp || new Date().toISOString();

  if (parsed.data.queues.length > 0) {
    const records = parsed.data.queues.map((q) => ({
      store_id: device.store_id,
      zone_id: q.zone_id,
      device_id: device.id,
      timestamp,
      people_in_queue: q.people_in_queue,
      estimated_wait_seconds: q.estimated_wait_seconds,
      peak_in_period: q.peak_in_period ?? 0,
      avg_in_period: q.avg_in_period ?? 0,
      is_open: q.is_open,
    }));

    await supabase.from("queue_snapshots").insert(records);
  }

  return NextResponse.json({ success: true, queues: parsed.data.queues.length });
}
