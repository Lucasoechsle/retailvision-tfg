import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDeviceSchema } from "@/lib/schemas/device";
import { generateDeviceKey } from "@/lib/data/devices";
import { authorizeStore } from "@/lib/auth/api";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const { data: devices, error } = await supabase
    .from("devices")
    .select("*, stores!inner(name, organization_id)")
    .eq("stores.organization_id", profile?.organization_id)
    .eq("is_active", true)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ devices });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createDeviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // HU-05: solo el administrador registra dispositivos
  const auth = await authorizeStore(parsed.data.store_id, "manage_devices");
  if (auth.error) return auth.error;

  const supabase = createClient();

  const apiKey = generateDeviceKey();

  const { data: device, error } = await supabase
    .from("devices")
    .insert({ ...parsed.data, api_key: apiKey })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ device }, { status: 201 });
}
