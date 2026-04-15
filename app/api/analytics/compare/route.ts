import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const storeId = searchParams.get("storeId");
  const currentStart = searchParams.get("currentStart");
  const currentEnd = searchParams.get("currentEnd");
  const previousStart = searchParams.get("previousStart");
  const previousEnd = searchParams.get("previousEnd");

  if (!storeId || !currentStart || !currentEnd || !previousStart || !previousEnd) {
    return NextResponse.json(
      { error: "Parámetros requeridos: storeId, currentStart, currentEnd, previousStart, previousEnd" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("compare_periods", {
    p_store_id: storeId,
    p_current_start: currentStart,
    p_current_end: currentEnd,
    p_previous_start: previousStart,
    p_previous_end: previousEnd,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comparisons: data || [] });
}
