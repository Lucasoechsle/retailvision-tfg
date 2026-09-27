import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  // Valida la organización y, para el gerente de tienda, que la tienda esté a su cargo
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;

  const supabase = createClient();

  const searchParams = request.nextUrl.searchParams;
  const dateFrom = searchParams.get("from") || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const dateTo = searchParams.get("to") || new Date().toISOString().split("T")[0];

  const { data: rankings, error } = await supabase.rpc("get_zone_rankings", {
    p_store_id: params.storeId,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });

  if (error) {
    const { data: zones } = await supabase
      .from("zones")
      .select("id, name, zone_type, color")
      .eq("store_id", params.storeId)
      .eq("is_active", true)
      .order("sort_order");

    return NextResponse.json({ zones: zones || [] });
  }

  return NextResponse.json({ zones: rankings || [] });
}
