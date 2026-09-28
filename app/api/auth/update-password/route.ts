import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { passwordError, updatePasswordSchema } from "@/lib/schemas/auth";

/**
 * HU-03: nueva contraseña desde el enlace de recuperación. La sesión es la que abre el
 * enlace; los requisitos de la contraseña se validan también en el servidor.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "El enlace venció o ya se usó. Pedí uno nuevo desde ¿Olvidaste tu contraseña?" },
      { status: 401 }
    );
  }

  const parsed = updatePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Falta la contraseña" }, { status: 400 });

  // La contraseña no puede contener el correo, el nombre ni la organización del usuario
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, organizations(name)")
    .eq("id", user.id)
    .maybeSingle();
  const organization = profile?.organizations as { name?: string } | { name?: string }[] | null | undefined;
  const error = passwordError(parsed.data.password, {
    email: user.email,
    fullName: profile?.full_name,
    organizationName: Array.isArray(organization) ? organization[0]?.name : organization?.name,
  });
  if (error) return NextResponse.json({ error }, { status: 400 });

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (updateError) {
    const same = (updateError as { code?: string }).code === "same_password";
    return NextResponse.json(
      {
        error: same
          ? "La nueva contraseña tiene que ser distinta de la anterior"
          : "No se pudo actualizar la contraseña. Pedí un nuevo enlace e intentá otra vez.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
