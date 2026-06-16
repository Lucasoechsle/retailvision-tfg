"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Clock,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { Store } from "@/types";

interface CurrentQueue {
  zone_id: string;
  zone_name: string;
  people_in_queue: number;
  estimated_wait_seconds: number;
  is_open: boolean;
  timestamp: string;
}

interface QueueHistoryEntry {
  hour: string;
  zone_id: string;
  zone_name: string;
  avg_people: number;
  max_people: number;
  avg_wait: number;
}

interface QueueMetrics {
  total_checkout_zones: number;
  total_people_in_queue: number;
  avg_wait_seconds: number;
  open_registers: number;
}

interface QueueData {
  metrics: QueueMetrics;
  current_queues: CurrentQueue[];
  history: QueueHistoryEntry[];
  zones: Array<{ id: string; name: string; color: string }>;
}

interface QueueViewProps {
  store: Store;
  data: QueueData;
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function QueueView({ store, data }: QueueViewProps) {
  const { metrics, current_queues, history } = data;

  const uniqueZones = Array.from(new Set(history.map((h) => h.zone_name)));
  const hourGroups: Record<string, Record<string, number>> = {};
  history.forEach((h) => {
    const hourLabel = new Date(h.hour).toLocaleTimeString("es", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!hourGroups[hourLabel]) hourGroups[hourLabel] = {};
    hourGroups[hourLabel][h.zone_name] = h.avg_people;
  });

  const chartData = Object.entries(hourGroups).map(([hour, zones]) => ({
    hour,
    ...zones,
  }));

  const colors = [
    "hsl(var(--primary))",
    "hsl(0 84.2% 60.2%)",
    "hsl(45 93% 47%)",
    "hsl(142 76% 36%)",
    "hsl(262 83% 58%)",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Colas</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Cajas Registradas"
          value={metrics.total_checkout_zones}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Personas en Cola"
          value={metrics.total_people_in_queue}
          icon={Users}
          changeType={metrics.total_people_in_queue > 5 ? "negative" : "positive"}
        />
        <MetricCard
          title="Espera Promedio"
          value={formatWait(metrics.avg_wait_seconds)}
          icon={Clock}
          changeType={metrics.avg_wait_seconds > 300 ? "negative" : "positive"}
        />
        <MetricCard
          title="Cajas Abiertas"
          value={`${metrics.open_registers}/${metrics.total_checkout_zones}`}
          icon={ShoppingCart}
        />
      </div>

      {/* Current Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Estado Actual de Cajas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {current_queues.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ShoppingCart className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Sin datos de colas</p>
                <p className="text-sm">Define zonas de tipo &quot;checkout&quot; para activar el monitoreo</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {current_queues.map((q) => (
                <div
                  key={q.zone_id}
                  className="rounded-lg border border-border p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{q.zone_name}</p>
                    <Badge variant={q.is_open ? "default" : "secondary"}>
                      {q.is_open ? "Abierta" : "Cerrada"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Personas</span>
                    <span className="font-medium flex items-center gap-1">
                      {q.people_in_queue > 5 && (
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      )}
                      {q.people_in_queue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Espera est.</span>
                    <span className="font-medium">
                      {formatWait(q.estimated_wait_seconds)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        q.people_in_queue > 8
                          ? "bg-destructive"
                          : q.people_in_queue > 4
                            ? "bg-yellow-500"
                            : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(q.people_in_queue * 10, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Colas por Hora
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <p>Sin datos históricos</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  label={{
                    value: "Personas",
                    angle: -90,
                    position: "insideLeft",
                    fill: "hsl(var(--muted-foreground))",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                {uniqueZones.map((zoneName, i) => (
                  <Area
                    key={zoneName}
                    type="monotone"
                    dataKey={zoneName}
                    stroke={colors[i % colors.length]}
                    fill={`${colors[i % colors.length].replace(")", " / 0.15)")}`}
                    name={zoneName}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
