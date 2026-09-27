import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorize } from "@/lib/auth/api";
import { inviteUserSchema } from "@/lib/schemas/user";
import { resolveStoreIds } from "@/lib/data/users";

export async function POST(request: NextRequest) {
  const auth = await authorize("manage_users");
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = inviteUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const storeIds = await resolveStoreIds(
    parsed.data.role,
    parsed.data.store_ids,
    auth.session.organizationId
  );
  if (storeIds === "invalid") {
    return NextResponse.json({ error: "Alguna tienda no pertenece a tu organización" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // El usuario define su contraseña desde "¿Olvidaste tu contraseña?" (HU-03)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: crypto.randomUUID() + "Aa1!",
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name || parsed.data.email },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from("user_profiles").insert({
    id: authData.user.id,
    organization_id: auth.session.organizationId,
    role: parsed.data.role,
    full_name: parsed.data.full_name || null,
    store_ids: storeIds,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `${parsed.data.email} agregado a la organización`,
    user: {
      id: authData.user.id,
      email: parsed.data.email,
      full_name: parsed.data.full_name || null,
      role: parsed.data.role,
      store_ids: storeIds,
      created_at: authData.user.created_at,
    },
  }, { status: 201 });
}
