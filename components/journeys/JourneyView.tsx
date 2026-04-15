"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import {
  Route,
  Footprints,
  Clock,
  ArrowRightLeft,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Store } from "@/types";

interface SankeyNode {
  name: string;
  color?: string;
}

interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

interface TopPattern {
  pattern: string;
  frequency: number;
  avg_dwell: number;
  avg_zones: number;
}

interface JourneyMetrics {
  total_journeys: number;
  avg_zones_visited: number;
  avg_dwell_seconds: number;
  bounce_rate: number;
}

interface JourneyData {
  metrics: JourneyMetrics;
  top_patterns: TopPattern[];
  sankey: {
    nodes: SankeyNode[];
    links: SankeyLink[];
  };
  zones: Array<{ id: string; name: string; color: string }>;
}

interface JourneyViewProps {
  store: Store;
  data: JourneyData;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function JourneyView({ store, data }: JourneyViewProps) {
  const { metrics, top_patterns, sankey } = data;

  const nodeNames = new Set<string>();
  sankey.links.forEach((l) => {
    nodeNames.add(l.source);
    nodeNames.add(l.target);
  });

  const flowChartData = sankey.links
    .sort((a, b) => b.value - a.value)
    .slice(0, 15)
    .map((l) => ({
      name: `${l.source} → ${l.target}`,
      transiciones: l.value,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recorridos</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Recorridos"
          value={metrics.total_journeys}
          icon={Route}
        />
        <MetricCard
          title="Zonas Promedio"
          value={metrics.avg_zones_visited}
          icon={Footprints}
          description="por recorrido"
        />
        <MetricCard
          title="Tiempo Promedio"
          value={formatDuration(metrics.avg_dwell_seconds)}
          icon={Clock}
          description="por recorrido"
        />
        <MetricCard
          title="Tasa de Rebote"
          value={`${metrics.bounce_rate}%`}
          icon={TrendingDown}
          description="1 zona o menos"
          changeType={metrics.bounce_rate > 50 ? "negative" : "positive"}
        />
      </div>

      {/* Zone Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Flujo entre Zonas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flowChartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Route className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Sin datos de flujo</p>
                <p className="text-sm">Los datos aparecerán cuando se detecten transiciones entre zonas</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(350, flowChartData.length * 40)}>
              <BarChart data={flowChartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  type="number"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={200}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar
                  dataKey="transiciones"
                  fill="hsl(var(--primary))"
                  radius={[0, 4, 4, 0]}
                  name="Transiciones"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5" />
            Top Recorridos Más Frecuentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {top_patterns.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Sin patrones detectados aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {top_patterns.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Badge variant="outline" className="shrink-0 w-8 justify-center">
                      #{i + 1}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{p.pattern}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.avg_zones} zonas · {formatDuration(p.avg_dwell)} promedio
                      </p>
                    </div>
                  </div>
                  <Badge className="ml-2 shrink-0">
                    {p.frequency}x
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
