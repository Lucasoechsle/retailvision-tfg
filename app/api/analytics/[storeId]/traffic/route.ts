import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";
import { canAccessStoreModule } from "@/lib/auth/roles";
import { addDays, dayRange, daysInclusive, isIsoDate, storeTimeZone } from "@/lib/dates";

interface HourRow {
  day: string;
  hour: number;
  entries: number;
  exits: number;
}

/**
 * Días hacia atrás del período de comparación: semanas completas, para que caiga en
 * los mismos días de la semana sin superponerse (hoy o 7 días: la semana anterior;
 * 30 días: 5 semanas antes).
 */
function comparisonShift(length: number): number {
  return Math.ceil(length / 7) * 7;
}

function summarize(rows: HourRow[]) {
  const byHour = new Map<number, number>();
  const byDay = new Map<string, number>();
  for (const r of rows) {
    byHour.set(r.hour, (byHour.get(r.hour) ?? 0) + r.entries);
    byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.entries);
  }
  const top = <K,>(map: Map<K, number>) =>
    Array.from(map.entries()).reduce<[K, number] | null>(
      (best, entry) => (entry[1] > 0 && (!best || entry[1] > best[1]) ? entry : best),
      null
    );
  const peakHour = top(byHour);
  const busiestDay = top(byDay);
  return {
    entries: rows.reduce((s, r) => s + r.entries, 0),
    exits: rows.reduce((s, r) => s + r.exits, 0),
    peak_hour: peakHour ? { hour: peakHour[0], entries: peakHour[1] } : null,
    busiest_day: busiestDay ? { day: busiestDay[0], entries: busiestDay[1] } : null,
  };
}

function sumBy(rows: HourRow[], match: (r: HourRow) => boolean) {
  let entries = 0;
  let exits = 0;
  for (const r of rows) {
    if (!match(r)) continue;
    entries += r.entries;
    exits += r.exits;
  }
  return { entries, exits };
}

/**
 * HU-10: entradas y salidas del período ?from&to (AAAA-MM-DD, en la zona horaria de la
 * tienda) por franja horaria y por día, comparadas con el mismo período de la semana
 * anterior (o de las semanas completas anteriores, si el período es más largo).
 */
export async function GET(request: NextRequest, { params }: { params: { storeId: string } }) {
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;
  if (!canAccessStoreModule(auth.session.role, "traffic")) {
    return NextResponse.json({ error: "Tu perfil no tiene acceso al tráfico" }, { status: 403 });
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

  const shift = comparisonShift(length);
  const previousFrom = addDays(from, -shift);
  const previousTo = addDays(to, -shift);
  const timeZone = storeTimeZone(auth.store);

  const supabase = createClient();
  const query = (a: string, b: string) => {
    const range = dayRange(a, b, timeZone);
    return supabase.rpc("get_traffic_hourly", {
      p_store_id: params.storeId,
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
      p_tz: timeZone,
    });
  };
  const [currentRes, previousRes] = await Promise.all([query(from, to), query(previousFrom, previousTo)]);
  const error = currentRes.error || previousRes.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const parse = (data: any[] | null): HourRow[] =>
    (data || []).map((r) => ({
      day: r.day,
      hour: Number(r.hour),
      entries: Number(r.entries),
      exits: Number(r.exits),
    }));
  const current = parse(currentRes.data);
  const previous = parse(previousRes.data);

  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const now = sumBy(current, (r) => r.hour === hour);
    const before = sumBy(previous, (r) => r.hour === hour);
    return { hour, ...now, previous_entries: before.entries, previous_exits: before.exits };
  });

  const daily = Array.from({ length }, (_, i) => {
    const day = addDays(from, i);
    const previousDay = addDays(day, -shift);
    const now = sumBy(current, (r) => r.day === day);
    const before = sumBy(previous, (r) => r.day === previousDay);
    return { day, previous_day: previousDay, ...now, previous_entries: before.entries, previous_exits: before.exits };
  });

  return NextResponse.json({
    current: { from, to, ...summarize(current) },
    previous: { from: previousFrom, to: previousTo, ...summarize(previous) },
    shift_days: shift,
    hourly,
    daily,
  });
}
