"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ArrowDownRight, ArrowUpRight, Clock, UserCheck, Users } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { changeProps, variation } from "@/lib/compare";
import { addDays, daysInclusive, formatStoreDateTime, storeTimeZone } from "@/lib/dates";
import type { Store, PeopleCount } from "@/types";

interface PeriodSummary {
  from: string;
  to: string;
  entries: number;
  exits: number;
  peak_hour: { hour: number; entries: number } | null;
  busiest_day: { day: string; entries: number } | null;
}

interface TrafficData {
  current: PeriodSummary;
  previous: PeriodSummary;
  shift_days: number;
  hourly: { hour: number; entries: number; exits: number; previous_entries: number; previous_exits: number }[];
  daily: {
    day: string;
    previous_day: string;
    entries: number;
    exits: number;
    previous_entries: number;
    previous_exits: number;
  }[];
}

interface ChartRow {
  label: string;
  tooltipLabel: string;
  entries: number;
  exits: number;
  prevEntries: number;
  prevExits: number;
}

interface TrafficViewProps {
  store: Store;
  /** Fecha de hoy en la zona horaria de la tienda (AAAA-MM-DD). */
  today: string;
  /** Último registro de conteo, para la ocupación actual. */
  latest: PeopleCount | null;
}

const PRESETS = [
  { label: "Hoy", days: 1 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
];

const ENTRIES_COLOR = "hsl(var(--primary))";
const EXITS_COLOR = "hsl(0 84.2% 60.2%)";
const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const pad = (n: number) => String(n).padStart(2, "0");
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const dayLabel = (date: string) => `${WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]} ${shortDate(date)}`;
const hourRange = (hour: number) => `${pad(hour)}:00 a ${pad(hour + 1)}:00`;
const count = (value: number) => value.toLocaleString("es-AR");

function periodLabel(period: { from: string; to: string }): string {
  return period.from === period.to ? dayLabel(period.from) : `${dayLabel(period.from)} al ${dayLabel(period.to)}`;
}

function TrafficChart({ data, compareName }: { data: ChartRow[]; compareName: string }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "var(--radius)",
            color: "hsl(var(--foreground))",
          }}
          labelFormatter={(label, payload) => payload?.[0]?.payload?.tooltipLabel ?? label}
          formatter={(value, name) => [count(Number(value ?? 0)), name]}
        />
        <Legend />
        <Bar dataKey="entries" name="Entradas" fill={ENTRIES_COLOR} opacity={0.75} radius={[4, 4, 0, 0]} />
        <Bar dataKey="exits" name="Salidas" fill={EXITS_COLOR} opacity={0.6} radius={[4, 4, 0, 0]} />
        <Line
          type="monotone"
          dataKey="prevEntries"
          name={`Entradas ${compareName}`}
          stroke={ENTRIES_COLOR}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="prevExits"
          name={`Salidas ${compareName}`}
          stroke={EXITS_COLOR}
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/**
 * HU-10: entradas y salidas por franja horaria y por día del período elegido (hoy,
 * 7 días, 30 días o personalizado), comparadas con el mismo período de la semana anterior.
 */
export function TrafficView({ store, today, latest }: TrafficViewProps) {
  const [range, setRange] = useState({ from: addDays(today, -6), to: today });
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/${store.id}/traffic?from=${range.from}&to=${range.to}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "No se pudo calcular el tráfico");
        return body;
      })
      .then((body) => !cancelled && setData(body))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [store.id, range]);

  const length = daysInclusive(range.from, range.to);
  const activePreset = range.to === today ? PRESETS.find((p) => p.days === length)?.days : undefined;

  const current = data?.current;
  const previous = data?.previous;
  const shift = data?.shift_days ?? 7;
  // Nombre de la serie comparada y la misma referencia dentro de una frase
  const compareName = shift === 7 ? "semana anterior" : `${shift / 7} semanas antes`;
  const comparePhrase = shift === 7 ? "la semana anterior" : compareName;
  const hasPrevious = !!previous && previous.entries + previous.exits > 0;
  const compareText = hasPrevious ? `vs ${comparePhrase}` : `sin datos de ${comparePhrase}`;

  // Solo las horas con registros en alguno de los dos períodos
  const hours = (data?.hourly || []).filter(
    (h) => h.entries + h.exits + h.previous_entries + h.previous_exits > 0
  );
  const noData = !!data && hours.length === 0;
  const hourlyChart: ChartRow[] =
    data && hours.length > 0
      ? data.hourly.slice(hours[0].hour, hours[hours.length - 1].hour + 1).map((h) => ({
          label: `${pad(h.hour)} h`,
          tooltipLabel: hourRange(h.hour),
          entries: h.entries,
          exits: h.exits,
          prevEntries: h.previous_entries,
          prevExits: h.previous_exits,
        }))
      : [];
  const dailyChart: ChartRow[] = (data?.daily || []).map((d) => ({
    label: length > 14 ? shortDate(d.day) : dayLabel(d.day),
    tooltipLabel: `${dayLabel(d.day)} (vs ${dayLabel(d.previous_day)})`,
    entries: d.entries,
    exits: d.exits,
    prevEntries: d.previous_entries,
    prevExits: d.previous_exits,
  }));

  const empty = (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      <div className="text-center">
        <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p>Sin datos de tráfico en este período ni en el de comparación</p>
        <p className="text-sm">Probá con otras fechas o revisá que los dispositivos estén enviando conteos</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tráfico</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1.5">
          {PRESETS.map((preset) => (
            <Button
              key={preset.days}
              variant={activePreset === preset.days ? "default" : "outline"}
              size="sm"
              onClick={() => setRange({ from: addDays(today, -(preset.days - 1)), to: today })}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="traffic-from" className="text-xs">Desde</Label>
          <Input
            id="traffic-from"
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => e.target.value && setRange({ ...range, from: e.target.value })}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="traffic-to" className="text-xs">Hasta</Label>
          <Input
            id="traffic-to"
            type="date"
            value={range.to}
            min={range.from}
            onChange={(e) => e.target.value && setRange({ ...range, to: e.target.value })}
            className="w-40"
          />
        </div>
        {loading && <span className="text-sm text-muted-foreground">Calculando…</span>}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Entradas"
          value={current ? count(current.entries) : "--"}
          icon={ArrowUpRight}
          description={current ? compareText : undefined}
          {...changeProps(variation(current?.entries ?? null, previous?.entries ?? null), "%")}
        />
        <MetricCard
          title="Salidas"
          value={current ? count(current.exits) : "--"}
          icon={ArrowDownRight}
          description={current ? compareText : undefined}
          {...changeProps(variation(current?.exits ?? null, previous?.exits ?? null), "%")}
        />
        <MetricCard
          title="Hora Pico"
          value={current?.peak_hour ? `${pad(current.peak_hour.hour)} h` : "--"}
          icon={Clock}
          description={
            current?.peak_hour
              ? `${hourRange(current.peak_hour.hour)}, ${count(current.peak_hour.entries)} entradas` +
                (previous?.peak_hour ? ` (${compareName}: ${pad(previous.peak_hour.hour)} h)` : "")
              : current
                ? "sin entradas en el período"
                : undefined
          }
        />
        <MetricCard
          title="En Tienda Ahora"
          value={latest ? count(latest.current_inside) : "--"}
          icon={UserCheck}
          description={
            latest
              ? `último registro: ${formatStoreDateTime(latest.timestamp, storeTimeZone(store))}`
              : "sin registros"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entradas y salidas por hora</CardTitle>
          <CardDescription>
            {current && previous
              ? `Total por franja horaria, ${periodLabel(current)}. En línea punteada, ${comparePhrase} (${periodLabel(previous)}).`
              : "Total por franja horaria del período."}
          </CardDescription>
        </CardHeader>
        <CardContent>{noData ? empty : <TrafficChart data={hourlyChart} compareName={compareName} />}</CardContent>
      </Card>

      {length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Entradas y salidas por día</CardTitle>
            <CardDescription>
              {current?.busiest_day
                ? `El día con más entradas fue el ${dayLabel(current.busiest_day.day)} (${count(current.busiest_day.entries)}). Cada día se compara con el mismo día de ${comparePhrase}.`
                : `Cada día se compara con el mismo día de ${comparePhrase}.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {noData ? empty : <TrafficChart data={dailyChart} compareName={compareName} />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
