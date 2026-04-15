import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const storeId = request.nextUrl.searchParams.get("storeId");
  const status = request.nextUrl.searchParams.get("status") || "active";

  let query = supabase
    .from("alert_events")
    .select("*, alert_rules(name, rule_type)")
    .eq("status", status)
    .order("triggered_at", { ascending: false })
    .limit(50);

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data });
}
