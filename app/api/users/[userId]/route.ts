import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth/api";
import { updateUserSchema } from "@/lib/schemas/user";
import { resolveStoreIds } from "@/lib/data/users";

/** Cambia el perfil de un usuario de la organización y, si es gerente de tienda, sus tiendas a cargo. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const auth = await authorize("manage_users");
  if (auth.error) return auth.error;

  if (params.userId === auth.session.userId) {
    return NextResponse.json(
      { error: "No podés cambiar tu propio perfil: la organización quedaría sin administrador" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("user_profiles")
    .select("id, organization_id")
    .eq("id", params.userId)
    .single();

  if (!target || target.organization_id !== auth.session.organizationId) {
    return NextResponse.json({ error: "Usuario no encontrado en tu organización" }, { status: 404 });
  }

  const storeIds = await resolveStoreIds(
    parsed.data.role,
    parsed.data.store_ids,
    auth.session.organizationId
  );
  if (storeIds === "invalid") {
    return NextResponse.json({ error: "Alguna tienda no pertenece a tu organización" }, { status: 400 });
  }

  const { data: profile, error } = await admin
    .from("user_profiles")
    .update({ role: parsed.data.role, store_ids: storeIds })
    .eq("id", params.userId)
    .select("id, role, store_ids")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ user: profile });
}
