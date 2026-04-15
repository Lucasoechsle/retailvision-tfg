"use client";

import { useState, useCallback } from "react";
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
import { Grid3X3, Eye, TrendingUp, LayoutGrid } from "lucide-react";
import type { Store } from "@/types";

interface ShelfZone {
  id: string;
  name: string;
  zone_type: string;
  color: string;
}

interface ShelfGridData {
  id?: string;
  zone_id: string;
  rows: number;
  cols: number;
  cell_labels: Record<string, string>;
}

interface AggregatedShelf {
  zone: ShelfZone;
  grid: ShelfGridData | null;
  latest: number[][] | null;
  avg_grid: number[][] | null;
  sample_count: number;
}

interface ShelfGridViewProps {
  store: Store;
  aggregated: AggregatedShelf[];
}

function getHeatColor(value: number): string {
  if (value <= 0) return "hsl(210, 20%, 96%)";
  if (value < 0.2) return "hsl(200, 60%, 85%)";
  if (value < 0.4) return "hsl(180, 70%, 65%)";
  if (value < 0.6) return "hsl(60, 80%, 55%)";
  if (value < 0.8) return "hsl(30, 90%, 50%)";
  return "hsl(0, 85%, 45%)";
}

function ShelfGrid({
  shelf,
  showMode,
}: {
  shelf: AggregatedShelf;
  showMode: "latest" | "average";
}) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  const gridData = showMode === "latest" ? shelf.latest : shelf.avg_grid;

  if (!gridData || gridData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Sin datos de heatmap</p>
      </div>
    );
  }

  const rows = gridData.length;
  const cols = gridData[0]?.length || 1;
  const labels = shelf.grid?.cell_labels || {};

  return (
    <div className="space-y-2">
      <div
        className="grid gap-1 rounded-lg border p-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {gridData.flatMap((row, r) =>
          row.map((value, c) => {
            const cellKey = `${r},${c}`;
            const label = labels[cellKey];
            const isHovered = hoveredCell === cellKey;

            return (
              <div
                key={cellKey}
                className="relative flex items-center justify-center rounded transition-all cursor-pointer"
                style={{
                  backgroundColor: getHeatColor(value),
                  aspectRatio: "1",
                  outline: isHovered ? "2px solid hsl(var(--primary))" : "none",
                  outlineOffset: "-1px",
                }}
                onMouseEnter={() => setHoveredCell(cellKey)}
                onMouseLeave={() => setHoveredCell(null)}
              >
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs shadow-md border">
                    {label || `Fila ${r + 1}, Col ${c + 1}`}
                    <br />
                    <span className="font-semibold">
                      {(value * 100).toFixed(0)}% actividad
                    </span>
                  </div>
                )}
                {label && (
                  <span className="text-[9px] text-center font-medium leading-tight px-0.5 truncate">
                    {label}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Bajo tráfico</span>
        <div className="flex gap-0.5">
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v) => (
            <div
              key={v}
              className="h-2.5 w-5 rounded-sm"
              style={{ backgroundColor: getHeatColor(v) }}
            />
          ))}
        </div>
        <span>Alto tráfico</span>
      </div>
    </div>
  );
}

export function ShelfGridView({ store, aggregated }: ShelfGridViewProps) {
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [showMode, setShowMode] = useState<"latest" | "average">("average");

  const filtered =
    selectedZone === "all"
      ? aggregated
      : aggregated.filter((a) => a.zone.id === selectedZone);

  const totalSamples = aggregated.reduce((s, a) => s + a.sample_count, 0);
  const withData = aggregated.filter((a) => a.sample_count > 0).length;

  const hottest = aggregated.reduce<{ zone: string; maxVal: number }>(
    (best, a) => {
      if (!a.avg_grid) return best;
      const maxInZone = Math.max(...a.avg_grid.flat());
      return maxInZone > best.maxVal
        ? { zone: a.zone.name, maxVal: maxInZone }
        : best;
    },
    { zone: "--", maxVal: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Análisis de Góndolas
        </h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Góndolas"
          value={aggregated.length}
          icon={LayoutGrid}
          description="zonas tipo góndola"
        />
        <MetricCard
          title="Con Datos"
          value={withData}
          icon={Grid3X3}
          description={`de ${aggregated.length} góndolas`}
        />
        <MetricCard
          title="Muestras"
          value={totalSamples}
          icon={Eye}
          description="heatmaps recopilados"
        />
        <MetricCard
          title="Zona Caliente"
          value={hottest.zone}
          icon={TrendingUp}
          description="mayor actividad"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <Select value={selectedZone} onValueChange={setSelectedZone}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filtrar góndola" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las góndolas</SelectItem>
            {aggregated.map((a) => (
              <SelectItem key={a.zone.id} value={a.zone.id}>
                {a.zone.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={showMode}
          onValueChange={(v) => setShowMode(v as "latest" | "average")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="average">Promedio (7 días)</SelectItem>
            <SelectItem value="latest">Último snapshot</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex h-64 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Grid3X3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <h3 className="text-lg font-medium">Sin góndolas configuradas</h3>
              <p className="mt-2 text-sm">
                Crea zonas de tipo &quot;gondola&quot; en el editor de zonas
                para activar este análisis.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {filtered.map((shelf) => (
            <Card key={shelf.zone.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{shelf.zone.name}</CardTitle>
                  <Badge
                    variant={shelf.sample_count > 0 ? "default" : "secondary"}
                  >
                    {shelf.sample_count} muestras
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ShelfGrid shelf={shelf} showMode={showMode} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
