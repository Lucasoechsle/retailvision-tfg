import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";
import { updateStoreSchema } from "@/lib/schemas/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;

  return NextResponse.json({ store: auth.store });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const auth = await authorizeStore(params.storeId, "manage_stores");
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = updateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const supabase = createClient();
  const { data: store, error } = await supabase
    .from("stores")
    .update(parsed.data)
    .eq("id", params.storeId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store });
}

/**
 * HU-04: baja lógica. La tienda se desactiva (is_active = false) y deja de aparecer
 * en el sistema, pero se conserva todo su histórico (conteos, recorridos,
 * transacciones, etc.). Se puede reactivar con PATCH { is_active: true }.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const auth = await authorizeStore(params.storeId, "manage_stores");
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { data: store, error } = await supabase
    .from("stores")
    .update({ is_active: false })
    .eq("id", params.storeId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store });
}
