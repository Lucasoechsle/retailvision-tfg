import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/devices/config
 * Called by edge devices using X-Device-Key header.
 * Returns full config: counting line, zones, device info.
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-Device-Key");
  if (!apiKey) {
    return NextResponse.json({ error: "API key requerida" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: device, error: deviceError } = await supabase
    .from("devices")
    .select("id, store_id, name, config, status")
    .eq("api_key", apiKey)
    .single();

  if (deviceError || !device) {
    return NextResponse.json({ error: "Device no encontrado" }, { status: 401 });
  }

  const { data: zones } = await supabase
    .from("zones")
    .select("id, name, zone_type, polygon, color, sort_order")
    .eq("store_id", device.store_id)
    .eq("is_active", true)
    .order("sort_order");

  return NextResponse.json({
    device_id: device.id,
    store_id: device.store_id,
    device_name: device.name,
    config: device.config || {},
    zones: zones || [],
  });
}
