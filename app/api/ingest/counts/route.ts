import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestCountsSchema } from "@/lib/schemas/ingest";

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
  const parsed = ingestCountsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await supabase
    .from("devices")
    .update({ status: "online", last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  const { error } = await supabase.from("people_counts").insert({
    device_id: device.id,
    store_id: device.store_id,
    timestamp: parsed.data.timestamp || new Date().toISOString(),
    entries: parsed.data.entries,
    exits: parsed.data.exits,
    current_inside: parsed.data.current_inside,
    period_seconds: parsed.data.period_seconds,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
