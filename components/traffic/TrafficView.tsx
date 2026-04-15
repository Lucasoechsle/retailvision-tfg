"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Users, ArrowUpRight, ArrowDownRight, UserCheck } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Store, PeopleCount } from "@/types";

interface TrafficViewProps {
  store: Store;
  counts: PeopleCount[];
}

export function TrafficView({ store, counts }: TrafficViewProps) {
  const totalEntries = counts.reduce((sum, c) => sum + c.entries, 0);
  const totalExits = counts.reduce((sum, c) => sum + c.exits, 0);
  const currentInside = counts.length > 0 ? counts[0].current_inside : 0;

  const chartData = [...counts]
    .reverse()
    .map((c) => ({
      time: new Date(c.timestamp).toLocaleTimeString("es", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      entries: c.entries,
      exits: c.exits,
      inside: c.current_inside,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tráfico</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Entradas Hoy"
          value={totalEntries}
          icon={ArrowUpRight}
          changeType="positive"
        />
        <MetricCard
          title="Salidas Hoy"
          value={totalExits}
          icon={ArrowDownRight}
          changeType="neutral"
        />
        <MetricCard
          title="En Tienda Ahora"
          value={currentInside}
          icon={UserCheck}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tráfico por Período</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Sin datos de tráfico</p>
                <p className="text-sm">Los datos aparecerán cuando los dispositivos envíen información</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="entries"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.1)"
                  name="Entradas"
                />
                <Area
                  type="monotone"
                  dataKey="exits"
                  stroke="hsl(0 84.2% 60.2%)"
                  fill="hsl(0 84.2% 60.2% / 0.1)"
                  name="Salidas"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
