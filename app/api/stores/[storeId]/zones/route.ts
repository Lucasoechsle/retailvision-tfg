import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createZoneSchema } from "@/lib/schemas/zone";
import { authorizeStore } from "@/lib/auth/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const supabase = createClient();
  const { data: zones, error } = await supabase
    .from("zones")
    .select("*")
    .eq("store_id", params.storeId)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zones });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  // HU-08: solo el administrador define zonas
  const auth = await authorizeStore(params.storeId, "manage_zones");
  if (auth.error) return auth.error;

  const supabase = createClient();
  const body = await request.json();
  const parsed = createZoneSchema.safeParse({ ...body, store_id: params.storeId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data: zone, error } = await supabase
    .from("zones")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ zone }, { status: 201 });
}
