"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DollarSign, ShoppingCart, TrendingUp, Users, Receipt } from "lucide-react";
import { changeProps, variation } from "@/lib/compare";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PeriodSummary {
  from: string;
  to: string;
  visitors: number;
  transactions: number;
  revenue: number;
  conversion_rate: number | null;
  avg_ticket: number | null;
}

interface ConversionData {
  current: PeriodSummary;
  previous: PeriodSummary;
  daily: { day: string; visitors: number; transactions: number; revenue: number; conversion_rate: number | null }[];
}

interface ConversionPerformanceProps {
  storeId: string;
  initialRange: { from: string; to: string };
  /** Cambia cuando se cargan o importan transacciones, para recalcular. */
  refreshKey: number;
}

const PRESETS = [7, 30, 90];

const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const money = (value: number) => `$${Math.round(value).toLocaleString("es-AR")}`;

/** HU-20: tasa de conversión del período, su tendencia diaria y la comparación con el período anterior. */
export function ConversionPerformance({ storeId, initialRange, refreshKey }: ConversionPerformanceProps) {
  const [range, setRange] = useState(initialRange);
  const [data, setData] = useState<ConversionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/${storeId}/conversion?from=${range.from}&to=${range.to}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "No se pudo calcular la conversión");
        return body;
      })
      .then((body) => !cancelled && setData(body))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [storeId, range, refreshKey]);

  const current = data?.current;
  const previous = data?.previous;
  const rateDelta =
    current?.conversion_rate != null && previous?.conversion_rate != null
      ? current.conversion_rate - previous.conversion_rate
      : null;

  const chartData = (data?.daily || []).map((d) => ({
    label: shortDate(d.day),
    Visitantes: d.visitors,
    Transacciones: d.transactions,
    Conversión: d.conversion_rate != null ? Number(d.conversion_rate.toFixed(1)) : null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="conv-from" className="text-xs">Desde</Label>
          <Input
            id="conv-from"
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conv-to" className="text-xs">Hasta</Label>
          <Input
            id="conv-to"
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="flex gap-1.5">
          {PRESETS.map((days) => (
            <Button
              key={days}
              variant="outline"
              size="sm"
              onClick={() => setRange({ from: addDays(range.to, -(days - 1)), to: range.to })}
            >
              {days} días
            </Button>
          ))}
        </div>
        {loading && <span className="text-sm text-muted-foreground">Calculando…</span>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Conversión"
          value={current?.conversion_rate != null ? `${current.conversion_rate.toFixed(1)}%` : "--"}
          icon={TrendingUp}
          description={
            current?.conversion_rate == null
              ? "sin visitantes en el período"
              : rateDelta != null
                ? "vs período anterior"
                : "sin datos del período anterior"
          }
          {...changeProps(rateDelta, "pp")}
        />
        <MetricCard
          title="Visitantes"
          value={current ? current.visitors.toLocaleString("es-AR") : "--"}
          icon={Users}
          {...changeProps(variation(current?.visitors ?? null, previous?.visitors ?? null), "%")}
        />
        <MetricCard
          title="Transacciones"
          value={current ? current.transactions.toLocaleString("es-AR") : "--"}
          icon={ShoppingCart}
          {...changeProps(variation(current?.transactions ?? null, previous?.transactions ?? null), "%")}
        />
        <MetricCard
          title="Revenue"
          value={current ? money(current.revenue) : "--"}
          icon={DollarSign}
          {...changeProps(variation(current?.revenue ?? null, previous?.revenue ?? null), "%")}
        />
        <MetricCard
          title="Ticket Promedio"
          value={current?.avg_ticket != null ? money(current.avg_ticket) : "--"}
          icon={Receipt}
          {...changeProps(variation(current?.avg_ticket ?? null, previous?.avg_ticket ?? null), "%")}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de la conversión</CardTitle>
          <CardDescription>
            {current && `${shortDate(current.from)}/${current.from.slice(0, 4)} al ${shortDate(current.to)}/${current.to.slice(0, 4)}`}
            {previous &&
              ` · período anterior (${shortDate(previous.from)} al ${shortDate(previous.to)}): ${
                previous.conversion_rate != null ? `${previous.conversion_rate.toFixed(1)}%` : "sin datos"
              } de conversión, ${previous.visitors.toLocaleString("es-AR")} visitantes y ${previous.transactions.toLocaleString("es-AR")} transacciones`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {current && current.visitors === 0 && current.transactions === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No hay visitantes ni transacciones en este período. Probá con otras fechas.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis yAxisId="count" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis
                  yAxisId="rate"
                  orientation="right"
                  unit="%"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value, name) =>
                    name === "Conversión"
                      ? [`${value}%`, name]
                      : [Number(value ?? 0).toLocaleString("es-AR"), name]
                  }
                />
                <Legend />
                <Bar yAxisId="count" dataKey="Visitantes" fill="hsl(var(--muted-foreground))" opacity={0.35} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="count" dataKey="Transacciones" fill="hsl(var(--primary))" opacity={0.45} radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="rate"
                  type="monotone"
                  dataKey="Conversión"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
                {previous?.conversion_rate != null && (
                  <ReferenceLine
                    yAxisId="rate"
                    y={Number(previous.conversion_rate.toFixed(1))}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="6 4"
                    label={{
                      value: `Período anterior ${previous.conversion_rate.toFixed(1)}%`,
                      position: "insideTopRight",
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 11,
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
