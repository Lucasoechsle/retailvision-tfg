import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";
import { updateZoneSchema } from "@/lib/schemas/zone";

type Params = { params: { storeId: string; zoneId: string } };

/**
 * HU-08: modifica una zona (nombre, tipo, color o forma). El edge toma el cambio
 * en su próxima consulta de configuración, sin reiniciarse.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authorizeStore(params.storeId, "manage_zones");
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = updateZoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const supabase = createClient();
  const { data: zone, error } = await supabase
    .from("zones")
    .update(parsed.data)
    .eq("id", params.zoneId)
    .eq("store_id", params.storeId)
    .eq("is_active", true)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!zone) return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
  return NextResponse.json({ zone });
}

/**
 * Baja lógica de la zona (is_active = false): deja de analizarse y de enviarse al
 * edge, pero se conserva su histórico. Un borrado físico eliminaría en cascada sus
 * eventos de permanencia, tráfico y resúmenes diarios.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await authorizeStore(params.storeId, "manage_zones");
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { data: zone, error } = await supabase
    .from("zones")
    .update({ is_active: false })
    .eq("id", params.zoneId)
    .eq("store_id", params.storeId)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!zone) return NextResponse.json({ error: "Zona no encontrada" }, { status: 404 });
  return NextResponse.json({ zone });
}
