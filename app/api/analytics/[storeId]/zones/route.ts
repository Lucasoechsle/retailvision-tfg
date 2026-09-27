import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";

const PERIODS = ["7", "30", "90", "all"] as const;

/**
 * HU-15: tráfico, dwell time y engagement (pass / browse / engaged) de cada zona
 * de la tienda en el período indicado (?days=7|30|90|all, por defecto 30).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  // Valida la organización y, para el gerente de tienda, que la tienda esté a su cargo
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;

  const days = request.nextUrl.searchParams.get("days") || "30";
  if (!(PERIODS as readonly string[]).includes(days)) {
    return NextResponse.json({ error: "Período inválido: usar 7, 30, 90 o all" }, { status: 400 });
  }

  const to = new Date();
  const from = days === "all" ? new Date("2000-01-01T00:00:00Z") : new Date(to.getTime() - Number(days) * 86400000);

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_zone_engagement", {
    p_store_id: params.storeId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const zones = (data || []).map((z: any) => ({
    zone_id: z.zone_id,
    zone_name: z.zone_name,
    zone_type: z.zone_type,
    zone_color: z.zone_color,
    visits: Number(z.visits),
    avg_dwell_seconds: z.avg_dwell_seconds,
    pass_count: Number(z.pass_count),
    browse_count: Number(z.browse_count),
    engaged_count: Number(z.engaged_count),
  }));

  return NextResponse.json({ zones, from: from.toISOString(), to: to.toISOString() });
}
