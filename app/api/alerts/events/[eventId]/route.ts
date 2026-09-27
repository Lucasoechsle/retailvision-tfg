import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth/api";
import { canAccessStore } from "@/lib/auth/session";

const updateSchema = z.object({
  status: z.enum(["acknowledged", "resolved"]),
});

/**
 * HU-12: el gerente marca una alerta como vista o resuelta.
 * La política RLS de alert_events no permite modificarla desde la sesión del usuario,
 * así que se valida el perfil y la tienda acá y se actualiza con el cliente de servicio.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const auth = await authorize("update_alerts");
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Estado inválido: usar acknowledged o resolved" }, { status: 400 });
  }

  // La sesión del usuario solo ve alertas de su organización (RLS)
  const supabase = createClient();
  const { data: event } = await supabase
    .from("alert_events")
    .select("id, status, stores(id, is_active, organization_id)")
    .eq("id", params.eventId)
    .maybeSingle();

  const store = (event as any)?.stores;
  if (!event || !store || store.organization_id !== auth.session.organizationId) {
    return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
  }
  if (!canAccessStore(auth.session, store)) {
    return NextResponse.json({ error: "No tenés acceso a esta tienda" }, { status: 403 });
  }
  if (event.status === "resolved") {
    return NextResponse.json({ error: "La alerta ya está resuelta" }, { status: 409 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("alert_events")
    .update({
      status: parsed.data.status,
      resolved_at: parsed.data.status === "resolved" ? new Date().toISOString() : null,
    })
    .eq("id", params.eventId)
    .select("id, status, resolved_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: updated });
}
