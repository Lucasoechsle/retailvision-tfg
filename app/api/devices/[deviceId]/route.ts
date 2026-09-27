import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeDevice } from "@/lib/auth/api";
import { generateDeviceKey } from "@/lib/data/devices";
import { updateDeviceSchema } from "@/lib/schemas/device";

type Params = { params: { deviceId: string } };

/** HU-05: edición del dispositivo (nombre). */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeDevice(params.deviceId, "manage_devices");
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = updateDeviceSchema.pick({ name: true }).required().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const supabase = createClient();
  const { data: device, error } = await supabase
    .from("devices")
    .update({ name: parsed.data.name.trim() })
    .eq("id", params.deviceId)
    .select("id, name")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ device });
}

/**
 * HU-05: baja lógica del dispositivo. Se conserva su histórico (conteos y mapas de
 * calor se borrarían en cascada con un DELETE) y se rota la clave para que la
 * anterior deje de ser aceptada por la ingesta.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await authorizeDevice(params.deviceId, "manage_devices");
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { error } = await supabase
    .from("devices")
    .update({ is_active: false, status: "offline", api_key: generateDeviceKey() })
    .eq("id", params.deviceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
