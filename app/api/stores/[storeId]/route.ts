import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateStoreSchema } from "@/lib/schemas/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const supabase = createClient();
  const { data: store, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", params.storeId)
    .single();

  if (error || !store) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ store });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = updateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data: store, error } = await supabase
    .from("stores")
    .update(parsed.data)
    .eq("id", params.storeId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { error } = await supabase
    .from("stores")
    .delete()
    .eq("id", params.storeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
