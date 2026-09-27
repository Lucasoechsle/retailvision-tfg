"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZONE_TYPE_LABELS } from "./zoneTypes";

interface ZoneMetrics {
  zone_id: string;
  zone_name: string;
  zone_type: string;
  zone_color: string;
  visits: number;
  avg_dwell_seconds: number | null;
  pass_count: number;
  browse_count: number;
  engaged_count: number;
}

type SortKey = "zone_name" | "visits" | "avg_dwell_seconds" | "pass" | "browse" | "engaged";
type EngagementKey = "pass" | "browse" | "engaged";

const PERIODS: Record<string, string> = {
  "7": "Últimos 7 días",
  "30": "Últimos 30 días",
  "90": "Últimos 90 días",
  all: "Todo el histórico",
};

/** Clasificación que calcula el edge según el tiempo de permanencia en la zona. */
const ENGAGEMENT: { key: EngagementKey; label: string; range: string; bar: string }[] = [
  { key: "pass", label: "Pass", range: "menos de 5 s", bar: "bg-slate-400" },
  { key: "browse", label: "Browse", range: "5 a 30 s", bar: "bg-amber-500" },
  { key: "engaged", label: "Engaged", range: "30 s o más", bar: "bg-emerald-500" },
];

const count = (z: ZoneMetrics, key: EngagementKey) =>
  key === "pass" ? z.pass_count : key === "browse" ? z.browse_count : z.engaged_count;
const share = (z: ZoneMetrics, key: EngagementKey) => (z.visits > 0 ? (count(z, key) / z.visits) * 100 : 0);

function formatDwell(seconds: number | null): string {
  if (seconds == null) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function sortValue(z: ZoneMetrics, key: SortKey): number | string {
  if (key === "zone_name") return z.zone_name.toLowerCase();
  if (key === "visits") return z.visits;
  if (key === "avg_dwell_seconds") return z.avg_dwell_seconds ?? -1;
  return share(z, key);
}

function ZoneLabel({ zone }: { zone: ZoneMetrics }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: zone.zone_color }} />
      <div>
        <p className="font-medium">{zone.zone_name}</p>
        <p className="text-xs text-muted-foreground">
          {ZONE_TYPE_LABELS[zone.zone_type] || zone.zone_type}
        </p>
      </div>
    </div>
  );
}

function EngagementBar({ zone }: { zone: ZoneMetrics }) {
  if (zone.visits === 0) return <div className="h-2 w-full rounded-full bg-muted" />;
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
      {ENGAGEMENT.map((e) => (
        <div key={e.key} className={e.bar} style={{ width: `${share(zone, e.key)}%` }} />
      ))}
    </div>
  );
}

/** HU-15: tráfico, dwell time y engagement por zona, ordenable y con comparación de dos zonas. */
export function ZoneAnalytics({ storeId }: { storeId: string }) {
  const [period, setPeriod] = useState("30");
  const [zones, setZones] = useState<ZoneMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "visits", dir: "desc" });
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/analytics/${storeId}/zones?days=${period}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar el análisis por zona");
        return data;
      })
      .then((data) => {
        if (!cancelled) setZones(data.zones);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, period]);

  const sorted = useMemo(() => {
    return [...zones].sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [zones, sort]);

  const totalEvents = zones.reduce((s, z) => s + z.visits, 0);
  const compared = selected
    .map((id) => zones.find((z) => z.zone_id === id))
    .filter((z): z is ZoneMetrics => Boolean(z));

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "zone_name" ? "asc" : "desc" }
    );

  // Se comparan de a dos zonas: al elegir una tercera, se reemplaza la más antigua
  const toggleSelected = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length >= 2 ? [prev[1], id] : [...prev, id]
    );

  const sortHeader = (label: string, sortKey: SortKey, className?: string) => {
    const active = sort.key === sortKey;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead
        key={sortKey}
        className={className}
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      >
        <button
          type="button"
          onClick={() => toggleSort(sortKey)}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground",
            active && "text-foreground"
          )}
        >
          {label}
          <Icon className="h-3.5 w-3.5" />
        </button>
      </TableHead>
    );
  };

  // better: qué valor es mejor para el negocio (más pass = más gente que pasa sin detenerse)
  const compareRows: {
    label: string;
    value: (z: ZoneMetrics) => number | null;
    format: (v: number | null) => string;
    better: "higher" | "lower" | null;
  }[] = [
    { label: "Visitas", value: (z) => z.visits, format: (v) => (v ?? 0).toLocaleString("es"), better: "higher" },
    { label: "Dwell time promedio", value: (z) => z.avg_dwell_seconds, format: formatDwell, better: "higher" },
    ...ENGAGEMENT.map((e) => ({
      label: `${e.label} (${e.range})`,
      value: (z: ZoneMetrics) => share(z, e.key),
      format: (v: number | null) => `${(v ?? 0).toFixed(1)}%`,
      better: e.key === "pass" ? ("lower" as const) : e.key === "engaged" ? ("higher" as const) : null,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          {ENGAGEMENT.map((e) => (
            <span key={e.key} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-full", e.bar)} />
              {e.label}: {e.range}
            </span>
          ))}
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PERIODS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {compared.length === 2 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <CardTitle className="text-base">Comparación de zonas</CardTitle>
              <CardDescription>{PERIODS[period]} · en verde, el mejor valor de cada métrica</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Quitar comparación
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  {compared.map((z) => (
                    <TableHead key={z.zone_id}>
                      <ZoneLabel zone={z} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {compareRows.map((row) => {
                  const values = compared.map((z) => row.value(z));
                  const [a, b] = values;
                  const bestIndex =
                    row.better === null || a == null || b == null || a === b
                      ? -1
                      : (row.better === "higher") === a > b
                        ? 0
                        : 1;
                  return (
                    <TableRow key={row.label}>
                      <TableCell className="text-muted-foreground">{row.label}</TableCell>
                      {compared.map((z, i) => (
                        <TableCell
                          key={z.zone_id}
                          className={cn(
                            "tabular-nums",
                            i === bestIndex && "font-semibold text-emerald-500"
                          )}
                        >
                          {row.format(values[i])}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tráfico, dwell time y engagement por zona</CardTitle>
          <CardDescription>
            {loading
              ? "Cargando…"
              : `${totalEvents.toLocaleString("es")} visitas a zonas · ${PERIODS[period].toLowerCase()} · seleccioná dos zonas para compararlas`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-6 text-center text-sm text-destructive">{error}</p>
          ) : (
            <>
              {!loading && totalEvents === 0 && (
                <p className="mb-3 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  No hay visitas registradas en este período. Probá con un período más largo.
                </p>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <span className="sr-only">Comparar</span>
                      </TableHead>
                      {sortHeader("Zona", "zone_name")}
                      {sortHeader("Visitas", "visits", "text-right")}
                      {sortHeader("Dwell prom.", "avg_dwell_seconds", "text-right")}
                      {ENGAGEMENT.map((e) => sortHeader(e.label, e.key, "text-right"))}
                      <TableHead className="min-w-32">Distribución</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((z) => (
                      <TableRow
                        key={z.zone_id}
                        data-state={selected.includes(z.zone_id) ? "selected" : undefined}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]"
                            aria-label={`Comparar ${z.zone_name}`}
                            checked={selected.includes(z.zone_id)}
                            onChange={() => toggleSelected(z.zone_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <ZoneLabel zone={z} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {z.visits.toLocaleString("es")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatDwell(z.avg_dwell_seconds)}
                        </TableCell>
                        {ENGAGEMENT.map((e) => (
                          <TableCell
                            key={e.key}
                            className="text-right tabular-nums"
                            title={`${count(z, e.key)} visitas`}
                          >
                            {z.visits > 0 ? `${share(z, e.key).toFixed(0)}%` : "--"}
                          </TableCell>
                        ))}
                        <TableCell>
                          <EngagementBar zone={z} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
