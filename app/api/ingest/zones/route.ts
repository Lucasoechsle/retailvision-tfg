import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestZoneDataSchema } from "@/lib/schemas/ingest";

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
  const parsed = ingestZoneDataSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await supabase
    .from("devices")
    .update({ status: "online", last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  const timestamp = parsed.data.timestamp || new Date().toISOString();

  for (const zone of parsed.data.zones) {
    await supabase.from("zone_traffic").insert({
      zone_id: zone.zone_id,
      store_id: device.store_id,
      device_id: device.id,
      timestamp,
      period_seconds: parsed.data.period_seconds,
      entries: zone.entries,
      exits: zone.exits,
      avg_occupancy: zone.avg_occupancy,
      peak_occupancy: zone.peak_occupancy,
    });

    if (zone.dwell_events && zone.dwell_events.length > 0) {
      const dwellRecords = zone.dwell_events.map((e) => ({
        zone_id: zone.zone_id,
        store_id: device.store_id,
        device_id: device.id,
        track_id: e.track_id,
        entered_at: e.entered_at,
        exited_at: e.exited_at || null,
        dwell_seconds: e.dwell_seconds || null,
        engagement_type: !e.dwell_seconds
          ? "pass"
          : e.dwell_seconds < 5
            ? "pass"
            : e.dwell_seconds < 30
              ? "browse"
              : "engaged",
      }));

      await supabase.from("dwell_events").insert(dwellRecords);
    }
  }

  return NextResponse.json({ success: true });
}
