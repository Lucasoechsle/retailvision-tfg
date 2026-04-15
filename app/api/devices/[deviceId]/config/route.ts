import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const lineConfigSchema = z.object({
  counting_line: z.object({
    start: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
    end: z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }),
    entry_direction: z.enum(["top_to_bottom", "bottom_to_top", "left_to_right", "right_to_left"]).default("top_to_bottom"),
  }).optional(),
  frame_server_port: z.number().int().optional(),
  camera_source: z.string().optional(),
}).passthrough();

/**
 * GET /api/devices/[deviceId]/config
 * Dashboard endpoint - session-authenticated.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: device } = await supabase
    .from("devices")
    .select("id, store_id, name, config, status, last_seen_at, api_key")
    .eq("id", params.deviceId)
    .single();

  if (!device) return NextResponse.json({ error: "Device no encontrado" }, { status: 404 });

  const { data: zones } = await supabase
    .from("zones")
    .select("id, name, zone_type, polygon, color, sort_order")
    .eq("store_id", device.store_id)
    .eq("is_active", true)
    .order("sort_order");

  const cfg = (device.config || {}) as Record<string, unknown>;
  const localIp = (cfg.local_ip as string) || null;
  const framePort = (cfg.frame_server_port as number) || 8765;

  return NextResponse.json({
    device_id: device.id,
    store_id: device.store_id,
    device_name: device.name,
    config: device.config || {},
    status: device.status,
    last_seen_at: device.last_seen_at,
    stream_url: localIp ? `ws://${localIp}:${framePort}` : null,
    zones: zones || [],
  });
}

/**
 * PUT /api/devices/[deviceId]/config
 * Save device config (counting line, etc) from dashboard.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { deviceId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: device } = await supabase
    .from("devices")
    .select("id, config")
    .eq("id", params.deviceId)
    .single();

  if (!device) return NextResponse.json({ error: "Device no encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = lineConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const existingConfig = (device.config || {}) as Record<string, unknown>;
  const mergedConfig = { ...existingConfig, ...parsed.data };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("devices")
    .update({ config: mergedConfig })
    .eq("id", params.deviceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, config: mergedConfig });
}
