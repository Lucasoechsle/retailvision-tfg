"use client";

import { useRef, useEffect, useState, useCallback, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Flame, Map, Snowflake } from "lucide-react";
import { HEATMAP_SLOTS, zoneIntensity, type HeatmapSlot } from "@/lib/heatmap";
import type { Store, FloorPlan, Zone } from "@/types";

interface ZoneTraffic {
  id: string;
  name: string;
  color: string;
  /** Tráfico promedio por área, relativo a la zona más caliente (= 100). */
  intensity: number;
}

interface HeatmapViewProps {
  store: Store;
  date: string;
  slot: HeatmapSlot;
  /** Suma de las grillas de calor de la fecha y franja elegidas (null = sin datos). */
  grid: number[][] | null;
  snapshots: number;
  floorPlan?: FloorPlan | null;
  zones?: Pick<Zone, "id" | "name" | "zone_type" | "polygon" | "color">[];
}

function heatColor(value: number, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, value));
  const r = Math.round(clamped < 0.5 ? 0 : (clamped - 0.5) * 2 * 255);
  const g = Math.round(clamped < 0.5 ? clamped * 2 * 255 : (1 - clamped) * 2 * 255);
  const b = Math.round(clamped < 0.5 ? (1 - clamped * 2) * 200 : 0);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function HeatmapCanvas({
  data,
  floorPlan,
  zones,
  opacity,
  showZones,
}: {
  data: number[][];
  floorPlan: FloorPlan | null;
  zones: Pick<Zone, "id" | "name" | "zone_type" | "polygon" | "color">[];
  opacity: number;
  showZones: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    if (!floorPlan?.image_url) {
      setCanvasSize({ w: 800, h: 600 });
      setImgLoaded(false);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const container = containerRef.current;
      if (container) {
        const maxW = container.clientWidth;
        const scale = maxW / img.naturalWidth;
        setCanvasSize({
          w: Math.round(img.naturalWidth * scale),
          h: Math.round(img.naturalHeight * scale),
        });
      }
      setImgLoaded(true);
    };
    img.src = floorPlan.image_url;
  }, [floorPlan?.image_url]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imgRef.current && imgLoaded) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (let x = 0; x < canvas.width; x += 40) {
        ctx.fillRect(x, 0, 1, canvas.height);
      }
      for (let y = 0; y < canvas.height; y += 40) {
        ctx.fillRect(0, y, canvas.width, 1);
      }
    }

    const rows = data.length;
    const cols = rows > 0 ? data[0].length : 1;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    const maxVal = Math.max(...data.flat(), 0.001);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const normalized = data[r][c] / maxVal;
        if (normalized < 0.02) continue;

        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;
        const radius = Math.max(cellW, cellH) * 1.2;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const color = heatColor(normalized, opacity);
        grad.addColorStop(0, color);
        grad.addColorStop(1, heatColor(normalized, 0));

        ctx.fillStyle = grad;
        ctx.fillRect(
          c * cellW - cellW * 0.2,
          r * cellH - cellH * 0.2,
          cellW * 1.4,
          cellH * 1.4
        );
      }
    }

    if (showZones && zones.length > 0) {
      for (const zone of zones) {
        if (!zone.polygon || zone.polygon.length < 3) continue;

        ctx.beginPath();
        ctx.moveTo(
          zone.polygon[0].x * canvas.width,
          zone.polygon[0].y * canvas.height
        );
        for (let i = 1; i < zone.polygon.length; i++) {
          ctx.lineTo(
            zone.polygon[i].x * canvas.width,
            zone.polygon[i].y * canvas.height
          );
        }
        ctx.closePath();
        ctx.strokeStyle = zone.color || "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "rgba(0,0,0,0.5)";
        const centroidX =
          zone.polygon.reduce((s, p) => s + p.x, 0) / zone.polygon.length;
        const centroidY =
          zone.polygon.reduce((s, p) => s + p.y, 0) / zone.polygon.length;
        const tx = centroidX * canvas.width;
        const ty = centroidY * canvas.height;

        ctx.font = "bold 11px sans-serif";
        const metrics = ctx.measureText(zone.name);
        ctx.fillRect(
          tx - metrics.width / 2 - 3,
          ty - 7,
          metrics.width + 6,
          14
        );
        ctx.fillStyle = zone.color || "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(zone.name, tx, ty);
      }
    }
  }, [data, imgLoaded, opacity, showZones, zones]);

  useEffect(() => {
    draw();
  }, [draw, canvasSize]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="w-full rounded-lg"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}

function ZoneRanking({
  title,
  description,
  icon: Icon,
  zones,
}: {
  title: string;
  description: string;
  icon: typeof Flame;
  zones: ZoneTraffic[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {zones.map((z, i) => (
            <li key={z.id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-4 text-right tabular-nums text-muted-foreground">{i + 1}</span>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: z.color }} />
                  <span className="font-medium">{z.name}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  intensidad {Math.round(z.intensity)}
                </span>
              </div>
              <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${z.intensity}%`, backgroundColor: z.color }}
                />
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

export function HeatmapView({
  store,
  date,
  slot,
  grid,
  snapshots,
  floorPlan,
  zones,
}: HeatmapViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [opacity, setOpacity] = useState([0.55]);
  const [showZones, setShowZones] = useState(true);

  const applyFilters = (nextDate: string, nextSlot: HeatmapSlot) => {
    if (!nextDate) return;
    startTransition(() => {
      router.push(`/stores/${store.id}/heatmap?date=${nextDate}&slot=${nextSlot}`);
    });
  };

  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const slotLabel = HEATMAP_SLOTS[slot].label.toLowerCase();

  // HU-14: cinco zonas más y cinco menos visitadas, según el mismo mapa de calor que se muestra
  const ranked = useMemo<ZoneTraffic[]>(() => {
    if (!grid) return [];
    const raw = (zones || []).map((z) => ({ ...z, value: zoneIntensity(grid, z.polygon) }));
    const hottest = Math.max(0, ...raw.map((z) => z.value));
    if (hottest <= 0) return [];
    return raw
      .map((z) => ({ id: z.id, name: z.name, color: z.color, intensity: (z.value / hottest) * 100 }))
      .sort((a, b) => b.intensity - a.intensity);
  }, [grid, zones]);
  const mostVisited = ranked.slice(0, 5);
  const leastVisited = [...ranked].reverse().slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mapa de Calor</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de Tráfico</CardTitle>
          <CardDescription className="first-letter:uppercase">
            {dateLabel} · {slotLabel}
            {grid && ` · ${snapshots} ${snapshots === 1 ? "captura" : "capturas"} del dispositivo`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="heatmap-date" className="text-xs">Fecha</Label>
                <Input
                  id="heatmap-date"
                  type="date"
                  value={date}
                  onChange={(e) => applyFilters(e.target.value, slot)}
                  className="w-[170px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Franja horaria</Label>
                <Select value={slot} onValueChange={(v) => applyFilters(date, v as HeatmapSlot)}>
                  <SelectTrigger className="w-[210px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(HEATMAP_SLOTS) as HeatmapSlot[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {HEATMAP_SLOTS[key].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 w-48">
                <Label className="text-xs">
                  Opacidad: {Math.round(opacity[0] * 100)}%
                </Label>
                <Slider
                  value={opacity}
                  onValueChange={setOpacity}
                  min={0.1}
                  max={1}
                  step={0.05}
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={showZones}
                  onChange={(e) => setShowZones(e.target.checked)}
                  className="rounded"
                />
                Mostrar zonas
              </label>

              {isPending && <span className="text-sm text-muted-foreground">Actualizando…</span>}
            </div>

            {!grid ? (
              <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-border">
                <div className="text-center text-muted-foreground">
                  <Map className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium">Sin datos de mapa de calor</h3>
                  <p className="mt-2 text-sm">
                    No hay capturas para esta fecha y franja horaria. Probá con otra fecha.
                  </p>
                </div>
              </div>
            ) : (
              <div className={isPending ? "opacity-60 transition-opacity" : undefined}>
                <HeatmapCanvas
                  data={grid}
                  floorPlan={floorPlan || null}
                  zones={zones || []}
                  opacity={opacity[0]}
                  showZones={showZones}
                />
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Bajo tráfico</span>
              <div className="flex gap-0.5">
                {[0, 0.15, 0.3, 0.5, 0.7, 0.85, 1.0].map((v) => (
                  <div
                    key={v}
                    className="h-3 w-6 rounded-sm"
                    style={{ backgroundColor: heatColor(v, 0.9) }}
                  />
                ))}
              </div>
              <span>Alto tráfico</span>
            </div>

            {!floorPlan?.image_url && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Sube una imagen de plano en la configuración de la tienda para
                superponer el heatmap sobre el diseño real.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {ranked.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ZoneRanking
            title="Zonas más visitadas"
            description="Mayor tráfico promedio por área · la más caliente = 100"
            icon={Flame}
            zones={mostVisited}
          />
          <ZoneRanking
            title="Zonas menos visitadas"
            description="Menor tráfico promedio por área · la más caliente = 100"
            icon={Snowflake}
            zones={leastVisited}
          />
        </div>
      )}
    </div>
  );
}
