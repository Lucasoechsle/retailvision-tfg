import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });

  const { data: users, error } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users });
}
