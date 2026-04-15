import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerSchema } from "@/lib/schemas/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, password, fullName, organizationName } = parsed.data;
    const supabaseAdmin = createAdminClient();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Error creando usuario" },
        { status: 500 }
      );
    }

    const slug = organizationName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: organizationName,
        slug: `${slug}-${Date.now()}`,
        plan: "trial",
      })
      .select()
      .single();

    if (orgError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Error creando organización" },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        id: authData.user.id,
        organization_id: org.id,
        role: "admin",
        full_name: fullName,
      });

    if (profileError) {
      await supabaseAdmin.from("organizations").delete().eq("id", org.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Error creando perfil de usuario" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cuenta creada exitosamente",
      user: { id: authData.user.id, email: authData.user.email },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
