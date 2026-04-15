import { createClient } from "@/lib/supabase/server";

export interface Insight {
  id: string;
  type: "trend" | "anomaly" | "recommendation" | "comparison";
  severity: "info" | "warning" | "success" | "alert";
  title: string;
  description: string;
  metric?: string;
  value?: number;
  change?: number;
  zone_id?: string;
  store_id: string;
  generated_at: string;
}

export async function generateStoreInsights(storeId: string): Promise<Insight[]> {
  const supabase = createClient();
  const insights: Insight[] = [];
  const now = new Date();

  const last7days = new Date(now);
  last7days.setDate(last7days.getDate() - 7);
  const prev7days = new Date(last7days);
  prev7days.setDate(prev7days.getDate() - 7);

  const { data: currentWeek } = await supabase
    .from("daily_store_summaries")
    .select("*")
    .eq("store_id", storeId)
    .gte("date", last7days.toISOString().split("T")[0])
    .order("date");

  const { data: previousWeek } = await supabase
    .from("daily_store_summaries")
    .select("*")
    .eq("store_id", storeId)
    .gte("date", prev7days.toISOString().split("T")[0])
    .lt("date", last7days.toISOString().split("T")[0])
    .order("date");

  if (currentWeek && previousWeek && currentWeek.length > 0 && previousWeek.length > 0) {
    const currVisitors = currentWeek.reduce((s, d) => s + (d.total_visitors || 0), 0);
    const prevVisitors = previousWeek.reduce((s, d) => s + (d.total_visitors || 0), 0);

    if (prevVisitors > 0) {
      const change = ((currVisitors - prevVisitors) / prevVisitors) * 100;

      if (Math.abs(change) > 5) {
        insights.push({
          id: `traffic-trend-${storeId}`,
          type: "trend",
          severity: change > 0 ? "success" : "warning",
          title: change > 0
            ? `Tráfico subió ${change.toFixed(1)}% esta semana`
            : `Tráfico bajó ${Math.abs(change).toFixed(1)}% esta semana`,
          description: `${currVisitors.toLocaleString()} visitantes esta semana vs ${prevVisitors.toLocaleString()} la semana anterior.`,
          metric: "visitors",
          value: currVisitors,
          change: parseFloat(change.toFixed(1)),
          store_id: storeId,
          generated_at: now.toISOString(),
        });
      }
    }

    // Peak hour shift detection
    const currPeaks = currentWeek.filter((d) => d.peak_hour !== null).map((d) => d.peak_hour);
    const prevPeaks = previousWeek.filter((d) => d.peak_hour !== null).map((d) => d.peak_hour);

    if (currPeaks.length > 0 && prevPeaks.length > 0) {
      const avgCurrPeak = Math.round(currPeaks.reduce((a, b) => a + b!, 0) / currPeaks.length);
      const avgPrevPeak = Math.round(prevPeaks.reduce((a, b) => a + b!, 0) / prevPeaks.length);

      if (avgCurrPeak !== avgPrevPeak) {
        insights.push({
          id: `peak-shift-${storeId}`,
          type: "trend",
          severity: "info",
          title: `La hora pico se movió de ${avgPrevPeak}:00 a ${avgCurrPeak}:00`,
          description: "Considera ajustar la dotación de personal según el nuevo patrón.",
          metric: "peak_hour",
          value: avgCurrPeak,
          store_id: storeId,
          generated_at: now.toISOString(),
        });
      }
    }

    // Conversion trend
    const currConv = currentWeek.filter((d) => d.conversion_rate).map((d) => d.conversion_rate!);
    const prevConv = previousWeek.filter((d) => d.conversion_rate).map((d) => d.conversion_rate!);

    if (currConv.length > 0 && prevConv.length > 0) {
      const avgCurrConv = currConv.reduce((a, b) => a + b, 0) / currConv.length;
      const avgPrevConv = prevConv.reduce((a, b) => a + b, 0) / prevConv.length;
      const convChange = avgCurrConv - avgPrevConv;

      if (Math.abs(convChange) > 1) {
        insights.push({
          id: `conv-trend-${storeId}`,
          type: "trend",
          severity: convChange > 0 ? "success" : "alert",
          title: convChange > 0
            ? `Conversión mejoró ${convChange.toFixed(1)} puntos`
            : `Conversión cayó ${Math.abs(convChange).toFixed(1)} puntos`,
          description: `Tasa actual: ${avgCurrConv.toFixed(1)}% vs ${avgPrevConv.toFixed(1)}% la semana anterior.`,
          metric: "conversion_rate",
          value: parseFloat(avgCurrConv.toFixed(1)),
          change: parseFloat(convChange.toFixed(1)),
          store_id: storeId,
          generated_at: now.toISOString(),
        });
      }
    }
  }

  // Zone insights
  const { data: zoneSummaries } = await supabase
    .from("daily_zone_summaries")
    .select("*, zones(name, zone_type)")
    .eq("store_id", storeId)
    .gte("date", last7days.toISOString().split("T")[0])
    .order("total_visits", { ascending: false });

  if (zoneSummaries && zoneSummaries.length > 0) {
    const zoneStats = new Map<string, { name: string; visits: number; dwell: number[]; engagement: number[] }>();

    for (const zs of zoneSummaries) {
      const zName = (zs.zones as any)?.name || zs.zone_id;
      if (!zoneStats.has(zs.zone_id)) {
        zoneStats.set(zs.zone_id, { name: zName, visits: 0, dwell: [], engagement: [] });
      }
      const stat = zoneStats.get(zs.zone_id)!;
      stat.visits += zs.total_visits || 0;
      if (zs.avg_dwell_seconds) stat.dwell.push(zs.avg_dwell_seconds);
      if (zs.engagement_rate) stat.engagement.push(zs.engagement_rate);
    }

    const sorted = Array.from(zoneStats.entries()).sort((a, b) => b[1].visits - a[1].visits);

    if (sorted.length >= 2) {
      const [topId, topStat] = sorted[0];
      const [bottomId, bottomStat] = sorted[sorted.length - 1];

      if (topStat.visits > 0) {
        insights.push({
          id: `top-zone-${storeId}`,
          type: "comparison",
          severity: "success",
          title: `"${topStat.name}" es la zona más visitada`,
          description: `${topStat.visits.toLocaleString()} visitas esta semana.`,
          metric: "zone_visits",
          value: topStat.visits,
          zone_id: topId,
          store_id: storeId,
          generated_at: now.toISOString(),
        });
      }

      if (bottomStat.visits === 0 || (topStat.visits > 0 && bottomStat.visits < topStat.visits * 0.1)) {
        insights.push({
          id: `dead-zone-${storeId}`,
          type: "recommendation",
          severity: "warning",
          title: `"${bottomStat.name}" tiene muy poco tráfico`,
          description: bottomStat.visits === 0
            ? "Esta zona no registró visitas esta semana. Considera reubicar productos o señalización."
            : `Solo ${bottomStat.visits} visitas (${((bottomStat.visits / topStat.visits) * 100).toFixed(0)}% del máximo). Evalúa cambios de layout.`,
          metric: "zone_visits",
          value: bottomStat.visits,
          zone_id: bottomId,
          store_id: storeId,
          generated_at: now.toISOString(),
        });
      }

      // High dwell, low visits recommendation
      for (const [zid, stat] of sorted) {
        const avgDwell = stat.dwell.length > 0 ? stat.dwell.reduce((a, b) => a + b, 0) / stat.dwell.length : 0;
        const avgEngagement = stat.engagement.length > 0 ? stat.engagement.reduce((a, b) => a + b, 0) / stat.engagement.length : 0;

        if (avgDwell > 60 && stat.visits < topStat.visits * 0.3) {
          insights.push({
            id: `high-dwell-low-traffic-${zid}`,
            type: "recommendation",
            severity: "info",
            title: `"${stat.name}" tiene alto engagement pero bajo tráfico`,
            description: `Dwell time promedio de ${Math.round(avgDwell)}s pero solo ${stat.visits} visitas. Los que llegan se quedan; el desafío es atraer más gente.`,
            metric: "dwell_time",
            value: Math.round(avgDwell),
            zone_id: zid,
            store_id: storeId,
            generated_at: now.toISOString(),
          });
        }
      }
    }
  }

  // Device offline warning
  const { data: devices } = await supabase
    .from("devices")
    .select("name, status, last_seen_at")
    .eq("store_id", storeId);

  if (devices) {
    const offlineDevices = devices.filter((d) => d.status === "offline");
    if (offlineDevices.length > 0) {
      insights.push({
        id: `devices-offline-${storeId}`,
        type: "anomaly",
        severity: "alert",
        title: `${offlineDevices.length} dispositivo(s) offline`,
        description: `Dispositivos desconectados: ${offlineDevices.map((d) => d.name).join(", ")}. Verifica la conexión.`,
        store_id: storeId,
        generated_at: now.toISOString(),
      });
    }
  }

  return insights;
}
