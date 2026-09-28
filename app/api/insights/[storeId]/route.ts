import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStoreInsights } from "@/lib/insights/engine";
import { authorizeStore } from "@/lib/auth/api";
import { storeTimeZone } from "@/lib/dates";

export async function GET(
  _request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  // Valida la organización y, para el gerente de tienda, que la tienda esté a su cargo
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;

  const supabase = createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("id", params.storeId)
    .single();

  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });

  try {
    const insights = await generateStoreInsights(params.storeId, storeTimeZone(auth.store));
    return NextResponse.json({ insights });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
