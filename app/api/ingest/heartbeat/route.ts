import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { heartbeatSchema } from "@/lib/schemas/ingest";

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-Device-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key requerida" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, config")
    .eq("api_key", apiKey)
    .single();

  if (deviceError || !device) {
    return NextResponse.json({ error: "Device no encontrado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = heartbeatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existingConfig = (device.config || {}) as Record<string, unknown>;
  const mergedConfig = {
    ...existingConfig,
    last_heartbeat: parsed.data,
    local_ip: parsed.data.local_ip || existingConfig.local_ip,
    frame_server_port: parsed.data.frame_server_port || existingConfig.frame_server_port,
  };

  await supabase
    .from("devices")
    .update({
      status: "online",
      last_seen_at: new Date().toISOString(),
      config: mergedConfig,
    })
    .eq("id", device.id);

  return NextResponse.json({ success: true });
}
