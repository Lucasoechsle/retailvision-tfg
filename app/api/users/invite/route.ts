import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "manager", "analyst", "viewer"]),
  full_name: z.string().min(1).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos para invitar usuarios" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const adminClient = createAdminClient();

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: Math.random().toString(36).slice(-12) + "A1!",
    email_confirm: false,
    user_metadata: { full_name: parsed.data.full_name || parsed.data.email },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await adminClient.from("user_profiles").insert({
    id: authData.user.id,
    organization_id: profile.organization_id,
    role: parsed.data.role,
    full_name: parsed.data.full_name || null,
  });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: `Invitación enviada a ${parsed.data.email}`,
    user: { id: authData.user.id, email: parsed.data.email, role: parsed.data.role },
  }, { status: 201 });
}
