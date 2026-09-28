import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { predictHourlyTraffic, predictDailyTraffic } from "@/lib/insights/predictions";
import { authorizeStore } from "@/lib/auth/api";
import { localDate, storeTimeZone, weekday } from "@/lib/dates";

export async function GET(
  request: NextRequest,
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

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "daily";
  // Día de la semana y fechas en la zona horaria de la tienda
  const timeZone = storeTimeZone(auth.store);
  const today = localDate(new Date(), timeZone);
  const dayOfWeek = parseInt(searchParams.get("day") || String(weekday(today)));
  const days = parseInt(searchParams.get("days") || "7");

  try {
    if (type === "hourly") {
      const predictions = await predictHourlyTraffic(params.storeId, dayOfWeek, timeZone);
      return NextResponse.json({ predictions, type: "hourly", day_of_week: dayOfWeek });
    }

    const predictions = await predictDailyTraffic(params.storeId, days, today);
    return NextResponse.json({ predictions, type: "daily", days_ahead: days });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
