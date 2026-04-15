import { notFound } from "next/navigation";
import { getStoreById } from "@/lib/data/stores";
import { JourneyView } from "@/components/journeys/JourneyView";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Recorridos" };

export default async function JourneysPage({
  params,
  searchParams,
}: {
  params: { storeId: string };
  searchParams: { start?: string; end?: string };
}) {
  const store = await getStoreById(params.storeId);
  if (!store) notFound();

  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];
  const startDate = searchParams.start || today;
  const endDate = searchParams.end || startDate;

  const [journeysRes, flowRes, zonesRes] = await Promise.all([
    supabase
      .from("customer_journeys")
      .select("*")
      .eq("store_id", params.storeId)
      .gte("started_at", `${startDate}T00:00:00.000Z`)
      .lte("started_at", `${endDate}T23:59:59.999Z`)
      .order("started_at", { ascending: false })
      .limit(500),

    supabase.rpc("get_zone_flow", {
      p_store_id: params.storeId,
      p_start: startDate,
      p_end: endDate,
    }),

    supabase
      .from("zones")
      .select("id, name, zone_type, color")
      .eq("store_id", params.storeId)
      .eq("is_active", true),
  ]);

  const journeys = journeysRes.data || [];
  const flow = flowRes.data || [];
  const zones = zonesRes.data || [];

  const zoneMap: Record<string, string> = {};
  zones.forEach((z: any) => { zoneMap[z.id] = z.name; });

  const totalJourneys = journeys.length;
  const avgZonesVisited = totalJourneys > 0
    ? journeys.reduce((s: number, j: any) => s + j.total_zones_visited, 0) / totalJourneys
    : 0;
  const avgDwellSeconds = totalJourneys > 0
    ? journeys.reduce((s: number, j: any) => s + j.total_dwell_seconds, 0) / totalJourneys
    : 0;
  const singleZoneJourneys = journeys.filter((j: any) => j.total_zones_visited <= 1).length;
  const bounceRate = totalJourneys > 0 ? (singleZoneJourneys / totalJourneys) * 100 : 0;

  const patternCounts: Record<string, { count: number; dwell: number; zones: number }> = {};
  journeys.forEach((j: any) => {
    const steps = (j.journey_data || []) as Array<{ zone_id: string }>;
    const pattern = steps.map((s) => zoneMap[s.zone_id] || s.zone_id).join(" → ");
    if (!patternCounts[pattern]) patternCounts[pattern] = { count: 0, dwell: 0, zones: 0 };
    patternCounts[pattern].count++;
    patternCounts[pattern].dwell += j.total_dwell_seconds;
    patternCounts[pattern].zones += j.total_zones_visited;
  });

  const topPatterns = Object.entries(patternCounts)
    .map(([pattern, d]) => ({
      pattern,
      frequency: d.count,
      avg_dwell: Math.round(d.dwell / d.count),
      avg_zones: Math.round(d.zones / d.count),
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  const sankeyLinks = flow.map((f: any) => ({
    source: zoneMap[f.from_zone_id] || f.from_zone_id,
    target: zoneMap[f.to_zone_id] || f.to_zone_id,
    value: Number(f.total_transitions),
  }));

  const data = {
    metrics: {
      total_journeys: totalJourneys,
      avg_zones_visited: Math.round(avgZonesVisited * 10) / 10,
      avg_dwell_seconds: Math.round(avgDwellSeconds),
      bounce_rate: Math.round(bounceRate * 10) / 10,
    },
    top_patterns: topPatterns,
    sankey: {
      nodes: zones.map((z: any) => ({ name: z.name, color: z.color })),
      links: sankeyLinks,
    },
    zones,
  };

  return <JourneyView store={store} data={data} />;
}
