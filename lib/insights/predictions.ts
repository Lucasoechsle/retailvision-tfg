import { createClient } from "@/lib/supabase/server";
import { addDays, dayRange, localDate, weekday } from "@/lib/dates";

export interface TrafficPrediction {
  hour: number;
  predicted_visitors: number;
  confidence: number;
  day_of_week: number;
}

export interface DailyPrediction {
  date: string;
  predicted_visitors: number;
  predicted_conversion: number | null;
  confidence: number;
}

/**
 * Predicción de visitantes por hora para un día de la semana: promedio ponderado de
 * las entradas de esa hora en ese mismo día de las últimas semanas (las más recientes
 * pesan más). Horas y días en la zona horaria de la tienda.
 */
export async function predictHourlyTraffic(
  storeId: string,
  targetDayOfWeek: number,
  timeZone: string
): Promise<TrafficPrediction[]> {
  const supabase = createClient();

  const weeksBack = 4;
  const today = localDate(new Date(), timeZone);
  const range = dayRange(addDays(today, -weeksBack * 7), addDays(today, -1), timeZone);

  // Entradas por día y hora ya agregadas en la base (no hay límite de filas)
  const { data: rows } = await supabase.rpc("get_traffic_hourly", {
    p_store_id: storeId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_tz: timeZone,
  });

  const days = Array.from(
    new Set((rows || []).map((r: any) => r.day as string).filter((d: string) => weekday(d) === targetDayOfWeek))
  ).sort();
  if (days.length === 0) return [];

  const predictions: TrafficPrediction[] = [];

  for (let h = 0; h < 24; h++) {
    // Un valor por semana (en orden cronológico): el total de entradas de esa hora
    const values = days.map((day) =>
      (rows || [])
        .filter((r: any) => r.day === day && Number(r.hour) === h)
        .reduce((sum: number, r: any) => sum + Number(r.entries), 0)
    );
    if (values.every((v) => v === 0)) {
      predictions.push({
        hour: h,
        predicted_visitors: 0,
        confidence: 0,
        day_of_week: targetDayOfWeek,
      });
      continue;
    }

    // More recent weeks get higher weight
    const weights = values.map((_, i) => i + 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const weighted = values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalWeight;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    const confidence = Math.max(0.2, Math.min(0.95, 1 - cv));

    predictions.push({
      hour: h,
      predicted_visitors: Math.round(weighted),
      confidence: parseFloat(confidence.toFixed(2)),
      day_of_week: targetDayOfWeek,
    });
  }

  return predictions;
}

/**
 * Predicts daily traffic for the next N days using day-of-week averages
 * and exponential smoothing.
 */
export async function predictDailyTraffic(
  storeId: string,
  daysAhead: number,
  /** Fecha de hoy en la tienda (AAAA-MM-DD). */
  today: string
): Promise<DailyPrediction[]> {
  const supabase = createClient();

  const { data: summaries } = await supabase
    .from("daily_store_summaries")
    .select("date, total_visitors, conversion_rate")
    .eq("store_id", storeId)
    .order("date", { ascending: false })
    .limit(60);

  if (!summaries || summaries.length < 7) return [];

  const byDow = new Map<number, { visitors: number[]; conv: number[] }>();
  for (let d = 0; d < 7; d++) {
    byDow.set(d, { visitors: [], conv: [] });
  }

  for (const s of summaries) {
    const dow = weekday(s.date);
    byDow.get(dow)?.visitors.push(s.total_visitors || 0);
    if (s.conversion_rate != null) byDow.get(dow)?.conv.push(s.conversion_rate);
  }

  const alpha = 0.3;
  const recentVisitors = summaries.slice(0, 7).map((s) => s.total_visitors || 0);
  const recentAvg = recentVisitors.reduce((a, b) => a + b, 0) / recentVisitors.length;
  const olderAvg = summaries.length > 14
    ? summaries.slice(7, 14).reduce((s, d) => s + (d.total_visitors || 0), 0) / 7
    : recentAvg;

  const trendFactor = olderAvg > 0 ? recentAvg / olderAvg : 1;

  const predictions: DailyPrediction[] = [];

  for (let i = 1; i <= daysAhead; i++) {
    const targetDate = addDays(today, i);
    const dow = weekday(targetDate);
    const dowData = byDow.get(dow)!;

    let predicted = 0;
    let confidence = 0.3;

    if (dowData.visitors.length > 0) {
      const weights = dowData.visitors.map((_, idx) => Math.pow(1 - alpha, idx));
      const totalW = weights.reduce((a, b) => a + b, 0);
      predicted = dowData.visitors.reduce((sum, v, idx) => sum + v * weights[idx], 0) / totalW;
      predicted = Math.round(predicted * trendFactor);

      const mean = dowData.visitors.reduce((a, b) => a + b, 0) / dowData.visitors.length;
      const variance = dowData.visitors.reduce((s, v) => s + (v - mean) ** 2, 0) / dowData.visitors.length;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
      confidence = Math.max(0.2, Math.min(0.9, 1 - cv - i * 0.02));
    }

    let predictedConv: number | null = null;
    if (dowData.conv.length > 0) {
      predictedConv = parseFloat(
        (dowData.conv.reduce((a, b) => a + b, 0) / dowData.conv.length).toFixed(1)
      );
    }

    predictions.push({
      date: targetDate,
      predicted_visitors: predicted,
      predicted_conversion: predictedConv,
      confidence: parseFloat(confidence.toFixed(2)),
    });
  }

  return predictions;
}
