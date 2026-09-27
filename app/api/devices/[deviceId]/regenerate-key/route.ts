import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeDevice } from "@/lib/auth/api";
import { generateDeviceKey } from "@/lib/data/devices";

/**
 * HU-05: regenera la device key ante sospecha de que fue comprometida. La clave
 * anterior deja de funcionar en el momento; la nueva se devuelve una sola vez para
 * configurarla en el edge (DEVICE_API_KEY).
 */
export async function POST(_request: NextRequest, { params }: { params: { deviceId: string } }) {
  const auth = await authorizeDevice(params.deviceId, "manage_devices");
  if (auth.error) return auth.error;

  const apiKey = generateDeviceKey();
  const supabase = createClient();
  const { error } = await supabase.from("devices").update({ api_key: apiKey }).eq("id", params.deviceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ api_key: apiKey });
}
