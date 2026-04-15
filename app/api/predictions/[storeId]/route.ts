import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { predictHourlyTraffic, predictDailyTraffic } from "@/lib/insights/predictions";

export async function GET(
  request: NextRequest,
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

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "daily";
  const dayOfWeek = parseInt(searchParams.get("day") || String(new Date().getDay()));
  const days = parseInt(searchParams.get("days") || "7");

  try {
    if (type === "hourly") {
      const predictions = await predictHourlyTraffic(params.storeId, dayOfWeek);
      return NextResponse.json({ predictions, type: "hourly", day_of_week: dayOfWeek });
    }

    const predictions = await predictDailyTraffic(params.storeId, days);
    return NextResponse.json({ predictions, type: "daily", days_ahead: days });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
