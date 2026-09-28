import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";
import { localDate, storeTimeZone } from "@/lib/dates";

export async function GET(
  _request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  // Valida la organización y, para el gerente de tienda, que la tienda esté a su cargo
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;

  const supabase = createClient();

  const storeId = params.storeId;
  const today = localDate(new Date(), storeTimeZone(auth.store));

  const [storeRes, devicesRes, countsRes, summaryRes] = await Promise.all([
    supabase.from("stores").select("*").eq("id", storeId).single(),
    supabase.from("devices").select("id, status").eq("store_id", storeId).eq("is_active", true),
    supabase
      .from("people_counts")
      .select("*")
      .eq("store_id", storeId)
      .order("timestamp", { ascending: false })
      .limit(1),
    supabase
      .from("daily_store_summaries")
      .select("*")
      .eq("store_id", storeId)
      .eq("date", today)
      .single(),
  ]);

  if (!storeRes.data) {
    return NextResponse.json({ error: "Tienda no encontrada" }, { status: 404 });
  }

  const devices = devicesRes.data || [];
  const latestCount = countsRes.data?.[0];
  const summary = summaryRes.data;

  return NextResponse.json({
    store: storeRes.data,
    total_visitors_today: summary?.total_visitors || 0,
    current_inside: latestCount?.current_inside || 0,
    avg_dwell_seconds: summary?.avg_dwell_seconds || null,
    conversion_rate: summary?.conversion_rate || null,
    peak_hour: summary?.peak_hour ?? null,
    devices_online: devices.filter((d) => d.status === "online").length,
    devices_total: devices.length,
  });
}
