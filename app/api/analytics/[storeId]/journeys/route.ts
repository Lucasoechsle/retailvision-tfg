import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";
import { dayRange, isIsoDate, localDate, storeTimeZone } from "@/lib/dates";

export async function GET(
  request: NextRequest,
  { params }: { params: { storeId: string } }
) {
  // Valida la organización y, para el gerente de tienda, que la tienda esté a su cargo
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;

  const supabase = createClient();

  const storeId = params.storeId;
  const url = new URL(request.url);
  // Las fechas del filtro son días de la tienda
  const timeZone = storeTimeZone(auth.store);
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const startDate = isIsoDate(start) ? start : localDate(new Date(), timeZone);
  const endDate = isIsoDate(end) && end >= startDate ? end : startDate;
  const range = dayRange(startDate, endDate, timeZone);

  const [journeysRes, flowRes, zonesRes] = await Promise.all([
    supabase
      .from("customer_journeys")
      .select("*")
      .eq("store_id", storeId)
      .gte("started_at", range.from.toISOString())
      .lt("started_at", range.to.toISOString())
      .order("started_at", { ascending: false })
      .limit(500),

    supabase.rpc("get_zone_flow", {
      p_store_id: storeId,
      p_start: startDate,
      p_end: endDate,
    }),

    supabase
      .from("zones")
      .select("id, name, zone_type, color")
      .eq("store_id", storeId)
      .eq("is_active", true),
  ]);

  const journeys = journeysRes.data || [];
  const flow = flowRes.data || [];
  const zones = zonesRes.data || [];

  const zoneMap: Record<string, string> = {};
  zones.forEach((z) => { zoneMap[z.id] = z.name; });

  const totalJourneys = journeys.length;
  const avgZonesVisited = totalJourneys > 0
    ? journeys.reduce((s, j) => s + j.total_zones_visited, 0) / totalJourneys
    : 0;
  const avgDwellSeconds = totalJourneys > 0
    ? journeys.reduce((s, j) => s + j.total_dwell_seconds, 0) / totalJourneys
    : 0;

  const singleZoneJourneys = journeys.filter((j) => j.total_zones_visited <= 1).length;
  const bounceRate = totalJourneys > 0 ? (singleZoneJourneys / totalJourneys) * 100 : 0;

  const patternCounts: Record<string, { count: number; dwell: number; zones: number }> = {};
  journeys.forEach((j) => {
    const steps = j.journey_data as Array<{ zone_id: string }>;
    const pattern = steps.map((s) => zoneMap[s.zone_id] || s.zone_id).join(" → ");
    if (!patternCounts[pattern]) {
      patternCounts[pattern] = { count: 0, dwell: 0, zones: 0 };
    }
    patternCounts[pattern].count++;
    patternCounts[pattern].dwell += j.total_dwell_seconds;
    patternCounts[pattern].zones += j.total_zones_visited;
  });

  const topPatterns = Object.entries(patternCounts)
    .map(([pattern, data]) => ({
      pattern,
      frequency: data.count,
      avg_dwell: Math.round(data.dwell / data.count),
      avg_zones: Math.round(data.zones / data.count),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  const sankeyLinks = flow.map((f: any) => ({
    source: zoneMap[f.from_zone_id] || f.from_zone_id,
    target: zoneMap[f.to_zone_id] || f.to_zone_id,
    value: Number(f.total_transitions),
  }));

  return NextResponse.json({
    metrics: {
      total_journeys: totalJourneys,
      avg_zones_visited: Math.round(avgZonesVisited * 10) / 10,
      avg_dwell_seconds: Math.round(avgDwellSeconds),
      bounce_rate: Math.round(bounceRate * 10) / 10,
    },
    top_patterns: topPatterns,
    sankey: {
      nodes: zones.map((z) => ({ name: z.name, color: z.color })),
      links: sankeyLinks,
    },
    zones,
  });
}
