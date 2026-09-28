"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import {
  Trophy,
  Store as StoreIcon,
  Users,
  TrendingUp,
  Clock,
  RefreshCw,
  Medal,
} from "lucide-react";

interface StoreMetric {
  store_id: string;
  store_name: string;
  address: string | null;
  days_with_data: number;
  total_visitors: number;
  avg_daily_visitors: number;
  total_transactions: number;
  avg_conversion_rate: number;
  avg_dwell_seconds: number;
  peak_hour: number | null;
  devices_online: number;
  devices_total: number;
  daily_trend: Array<{ date: string; visitors: number; transactions: number }>;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(0 84.2% 60.2%)",
  "hsl(45 93% 47%)",
  "hsl(142 76% 36%)",
  "hsl(262 83% 58%)",
  "hsl(200 95% 50%)",
];

export function BenchmarkView() {
  const [data, setData] = useState<{ benchmark: StoreMetric[]; period_days: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  const fetchData = async (days: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/benchmark?days=${days}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(period); }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const benchmark = data?.benchmark || [];

  if (benchmark.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <StoreIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">Sin datos</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Se necesitan al menos 2 tiendas con datos para hacer benchmarking.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalVisitors = benchmark.reduce((s, b) => s + b.total_visitors, 0);
  const avgConversion = benchmark.length > 0
    ? benchmark.reduce((s, b) => s + b.avg_conversion_rate, 0) / benchmark.length
    : 0;
  const topStore = benchmark[0];

  const comparisonData = benchmark.map((b) => ({
    name: b.store_name,
    visitantes: b.avg_daily_visitors,
    conversion: b.avg_conversion_rate,
    dwell: Math.round(b.avg_dwell_seconds / 60),
  }));

  const allDates = new Set<string>();
  benchmark.forEach((b) => b.daily_trend.forEach((d) => allDates.add(d.date)));
  const sortedDates = Array.from(allDates).sort();

  const trendData = sortedDates.map((date) => {
    const point: Record<string, any> = {
      date: new Date(`${date}T12:00:00`).toLocaleDateString("es", { day: "2-digit", month: "short" }),
    };
    benchmark.forEach((b) => {
      const dayData = b.daily_trend.find((d) => d.date === date);
      point[b.store_name] = dayData?.visitors || 0;
    });
    return point;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="14">Últimos 14 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => fetchData(period)}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Tiendas Activas" value={benchmark.length} icon={StoreIcon} />
        <MetricCard title="Visitantes Totales" value={totalVisitors.toLocaleString("es")} icon={Users} />
        <MetricCard title="Conversión Prom." value={`${avgConversion.toFixed(1)}%`} icon={TrendingUp} />
        <MetricCard
          title="Líder"
          value={topStore.store_name}
          icon={Trophy}
          description={`${topStore.avg_daily_visitors} vis/día`}
        />
      </div>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5" />
            Ranking de Sucursales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {benchmark.map((b, i) => (
              <div key={b.store_id} className="flex items-center gap-4 rounded-lg border p-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                  i === 0 ? "bg-yellow-500/20 text-yellow-500" :
                  i === 1 ? "bg-gray-300/20 text-gray-400" :
                  i === 2 ? "bg-amber-700/20 text-amber-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{b.store_name}</p>
                  {b.address && <p className="text-xs text-muted-foreground truncate">{b.address}</p>}
                </div>
                <div className="grid grid-cols-4 gap-6 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Vis/día</p>
                    <p className="font-bold">{b.avg_daily_visitors}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Conversión</p>
                    <p className="font-bold">{b.avg_conversion_rate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Dwell</p>
                    <p className="font-bold">{Math.round(b.avg_dwell_seconds / 60)}m</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Devices</p>
                    <p className="font-bold">{b.devices_online}/{b.devices_total}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comparison Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativa de Métricas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Legend />
              <Bar dataKey="visitantes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Visitantes/día" />
              <Bar dataKey="conversion" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} name="Conversión %" />
              <Bar dataKey="dwell" fill="hsl(45 93% 47%)" radius={[4, 4, 0, 0]} name="Dwell (min)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trend Lines */}
      {trendData.length > 0 && benchmark.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Visitantes</CardTitle>
            <CardDescription>Comparativa diaria entre sucursales</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                {benchmark.map((b, i) => (
                  <Line
                    key={b.store_id}
                    type="monotone"
                    dataKey={b.store_name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
