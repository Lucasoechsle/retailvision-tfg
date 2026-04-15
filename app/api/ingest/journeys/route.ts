import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestJourneysSchema } from "@/lib/schemas/ingest";

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
  const parsed = ingestJourneysSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await supabase
    .from("devices")
    .update({ status: "online", last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  const timestamp = parsed.data.timestamp || new Date().toISOString();

  if (parsed.data.journeys.length > 0) {
    const journeyRecords = parsed.data.journeys.map((j) => ({
      store_id: device.store_id,
      device_id: device.id,
      track_id: j.track_id,
      started_at: j.started_at,
      ended_at: j.ended_at,
      total_zones_visited: j.total_zones_visited,
      total_dwell_seconds: j.total_dwell_seconds,
      journey_data: j.journey_data,
    }));

    await supabase.from("customer_journeys").insert(journeyRecords);
  }

  if (parsed.data.transitions.length > 0) {
    const transitionRecords = parsed.data.transitions.map((t) => ({
      store_id: device.store_id,
      from_zone_id: t.from_zone_id,
      to_zone_id: t.to_zone_id,
      transition_count: t.count,
      timestamp,
    }));

    await supabase.from("zone_transitions").insert(transitionRecords);
  }

  return NextResponse.json({ success: true, journeys: parsed.data.journeys.length });
}
