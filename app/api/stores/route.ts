import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/auth/api";
import { getAccessibleStores } from "@/lib/auth/session";
import { createStoreSchema } from "@/lib/schemas/store";

export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;

  const stores = await getAccessibleStores(auth.session);
  return NextResponse.json({ stores });
}

export async function POST(request: NextRequest) {
  const auth = await authorize("manage_stores");
  if (auth.error) return auth.error;

  const body = await request.json();
  const parsed = createStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const supabase = createClient();
  const { data: store, error } = await supabase
    .from("stores")
    .insert({ ...parsed.data, organization_id: auth.session.organizationId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ store }, { status: 201 });
}
