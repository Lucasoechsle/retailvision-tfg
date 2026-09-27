import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";
import { canAccessStoreModule } from "@/lib/auth/roles";
import { addDays, dayRange, daysInclusive, isIsoDate } from "@/lib/dates";

interface DayRow {
  day: string;
  visitors: number;
  transactions: number;
  revenue: number;
}

function summarize(rows: DayRow[]) {
  const visitors = rows.reduce((s, r) => s + r.visitors, 0);
  const transactions = rows.reduce((s, r) => s + r.transactions, 0);
  const revenue = rows.reduce((s, r) => s + r.revenue, 0);
  return {
    visitors,
    transactions,
    revenue,
    conversion_rate: visitors > 0 ? (transactions / visitors) * 100 : null,
    avg_ticket: transactions > 0 ? revenue / transactions : null,
  };
}

/**
 * HU-20: tasa de conversión (transacciones / visitantes) del período ?from&to
 * (AAAA-MM-DD, en la zona horaria de la tienda), su serie diaria y el período
 * anterior de la misma duración para comparar.
 */
export async function GET(request: NextRequest, { params }: { params: { storeId: string } }) {
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;
  if (!canAccessStoreModule(auth.session.role, "conversion")) {
    return NextResponse.json({ error: "Tu perfil no tiene acceso a la conversión" }, { status: 403 });
  }

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
    return NextResponse.json({ error: "Período inválido: usar from y to con formato AAAA-MM-DD" }, { status: 400 });
  }
  const length = daysInclusive(from, to);
  if (length > 366) {
    return NextResponse.json({ error: "El período no puede superar un año" }, { status: 400 });
  }

  const previousFrom = addDays(from, -length);
  const previousTo = addDays(from, -1);
  const timeZone = auth.store.timezone || "America/Argentina/Cordoba";
  const range = dayRange(previousFrom, to, timeZone);

  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_conversion_daily", {
    p_store_id: params.storeId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_tz: timeZone,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows: DayRow[] = (data || []).map((r: any) => ({
    day: r.day,
    visitors: Number(r.visitors),
    transactions: Number(r.transactions),
    revenue: Number(r.revenue),
  }));
  const current = rows.filter((r) => r.day >= from);
  const previous = rows.filter((r) => r.day < from);

  return NextResponse.json({
    current: { from, to, ...summarize(current) },
    previous: { from: previousFrom, to: previousTo, ...summarize(previous) },
    daily: current.map((r) => ({
      ...r,
      conversion_rate: r.visitors > 0 ? (r.transactions / r.visitors) * 100 : null,
    })),
  });
}
