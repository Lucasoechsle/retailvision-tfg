import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStoreInsights } from "@/lib/insights/engine";

export async function GET(
  _request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("id", params.storeId)
    .single();

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  try {
    const insights = await generateStoreInsights(params.storeId);
    return NextResponse.json({ insights });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
