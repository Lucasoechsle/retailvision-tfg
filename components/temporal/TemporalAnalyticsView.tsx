"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/dashboard/MetricCard";
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  Clock,
  Calendar,
  TrendingUp,
  TrendingDown,
  Sun,
  BarChart3,
} from "lucide-react";
import type { Store } from "@/types";

interface HourlyData {
  hour_of_day: number;
  avg_entries: number;
  total_entries: number;
  sample_days: number;
}

interface DowData {
  day_of_week: number;
  day_name: string;
  avg_visitors: number;
  total_visitors: number;
  avg_conversion: number;
}

interface MonthlyData {
  year_month: string;
  total_visitors: number;
  avg_daily_visitors: number;
  total_transactions: number;
  avg_conversion: number;
  days_with_data: number;
}

interface TrendingZone {
  zone_id: string;
  zone_name: string;
  current_visits: number;
  previous_visits: number;
  change_pct: number;
}

interface CalendarDay {
  date: string;
  total_visitors: number;
  total_transactions: number;
}

interface TemporalSummary {
  peak_hour: { hour: number; avg_entries: number } | null;
  peak_day: { day: number; name: string; avg_visitors: number } | null;
  total_visitors_year: number;
  months_with_data: number;
}

interface TemporalAnalyticsViewProps {
  store: Store;
  storeId: string;
}

function CalendarHeatmap({ data }: { data: CalendarDay[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Sin datos de calendario
      </div>
    );
  }

  const maxVisitors = Math.max(...data.map((d) => d.total_visitors), 1);
  const months: Record<string, CalendarDay[]> = {};
  for (const d of data) {
    const month = d.date.substring(0, 7);
    if (!months[month]) months[month] = [];
    months[month].push(d);
  }

  const monthNames = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  return (
    <div className="space-y-1 overflow-x-auto">
      <div className="flex gap-1 min-w-[700px]">
        {Object.entries(months).map(([month, days]) => (
          <div key={month} className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground mb-1 text-center">
              {monthNames[parseInt(month.split("-")[1], 10) - 1]}
            </p>
            <div className="grid grid-cols-7 gap-px">
              {days.map((d) => {
                const intensity = d.total_visitors / maxVisitors;
                return (
                  <div
                    key={d.date}
                    className="aspect-square rounded-sm"
                    title={`${d.date}: ${d.total_visitors} visitantes`}
                    style={{
                      backgroundColor:
                        intensity <= 0
                          ? "hsl(var(--muted))"
                          : `hsl(142, ${40 + intensity * 40}%, ${85 - intensity * 55}%)`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground pt-1">
        <span>Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <div
            key={v}
            className="h-2.5 w-2.5 rounded-sm"
            style={{
              backgroundColor:
                v <= 0
                  ? "hsl(var(--muted))"
                  : `hsl(142, ${40 + v * 40}%, ${85 - v * 55}%)`,
            }}
          />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}

export function TemporalAnalyticsView({
  store,
  storeId,
}: TemporalAnalyticsViewProps) {
  const [loading, setLoading] = useState(true);
  const [hourly, setHourly] = useState<HourlyData[]>([]);
  const [dow, setDow] = useState<DowData[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [trending, setTrending] = useState<TrendingZone[]>([]);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [summary, setSummary] = useState<TemporalSummary | null>(null);
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/analytics/${storeId}/temporal?year=${year}`
      );
      if (res.ok) {
        const json = await res.json();
        setHourly(json.hourly || []);
        setDow(json.dow || []);
        setMonthly(json.monthly || []);
        setTrending(json.trending || []);
        setCalendar(json.calendar || []);
        setSummary(json.summary || null);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [storeId, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 3 }, (_, i) =>
    String(currentYear - i)
  );

  const hourlyChartData = hourly.map((h) => ({
    hora: `${h.hour_of_day}:00`,
    promedio: Math.round(h.avg_entries),
    total: h.total_entries,
  }));

  const radarData = dow.map((d) => ({
    day: d.day_name,
    visitantes: Math.round(d.avg_visitors),
    fullMark: Math.max(...dow.map((x) => x.avg_visitors)) * 1.1,
  }));

  const monthlyChartData = monthly.map((m) => ({
    mes: m.year_month.split("-")[1],
    visitantes: m.total_visitors,
    promedio_diario: Math.round(m.avg_daily_visitors),
    transacciones: m.total_transactions,
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analytics Temporales
          </h1>
          <p className="mt-1 text-muted-foreground">{store.name}</p>
        </div>
        <div className="flex h-96 items-center justify-center">
          <div className="text-muted-foreground">Cargando datos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Analytics Temporales
          </h1>
          <p className="mt-1 text-muted-foreground">{store.name}</p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Hora Pico"
          value={
            summary?.peak_hour ? `${summary.peak_hour.hour}:00` : "--"
          }
          icon={Clock}
          description={
            summary?.peak_hour
              ? `~${Math.round(summary.peak_hour.avg_entries)} entradas/h`
              : "sin datos"
          }
        />
        <MetricCard
          title="Día Más Activo"
          value={summary?.peak_day?.name || "--"}
          icon={Sun}
          description={
            summary?.peak_day
              ? `~${Math.round(summary.peak_day.avg_visitors)} visitantes`
              : "sin datos"
          }
        />
        <MetricCard
          title="Visitantes Año"
          value={
            summary?.total_visitors_year
              ? summary.total_visitors_year.toLocaleString("es")
              : "--"
          }
          icon={Calendar}
          description={`${summary?.months_with_data || 0} meses con datos`}
        />
        <MetricCard
          title="Meses Registrados"
          value={summary?.months_with_data || 0}
          icon={BarChart3}
          description="periodos con actividad"
        />
      </div>

      {/* Calendar Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendario de Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarHeatmap data={calendar} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            {hourlyChartData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Sin datos de distribución horaria
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="hora" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                  <Bar
                    dataKey="promedio"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Promedio entradas"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Weekly Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patrón Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            {radarData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Sin datos de patrón semanal
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <Radar
                    name="Visitantes"
                    dataKey="visitantes"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--popover))",
                      color: "hsl(var(--popover-foreground))",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tendencia Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyChartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Sin datos de tendencia mensual
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="visitantes"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Visitantes totales"
                />
                <Line
                  type="monotone"
                  dataKey="transacciones"
                  stroke="hsl(142, 70%, 45%)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name="Transacciones"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Trending Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Zonas Trending (últimos 7 días vs anteriores)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trending.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Sin datos de trending
            </div>
          ) : (
            <div className="space-y-3">
              {trending.map((zone) => {
                const isUp = zone.change_pct > 0;
                const isDown = zone.change_pct < 0;
                return (
                  <div
                    key={zone.zone_id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      {isUp ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : isDown ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {zone.zone_name || zone.zone_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {zone.current_visits} visitas actuales vs{" "}
                          {zone.previous_visits} previas
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={isUp ? "default" : isDown ? "destructive" : "secondary"}
                    >
                      {isUp ? "+" : ""}
                      {zone.change_pct.toFixed(1)}%
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
