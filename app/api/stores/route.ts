import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createStoreSchema } from "@/lib/schemas/store";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const { data: stores, error } = await supabase
    .from("stores")
    .select("*")
    .eq("organization_id", profile?.organization_id)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stores });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = createStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager", "owner"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { data: store, error } = await supabase
    .from("stores")
    .insert({ ...parsed.data, organization_id: profile.organization_id })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store }, { status: 201 });
}
