"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Map } from "lucide-react";
import type { Store, ZoneHeatmap, FloorPlan, Zone } from "@/types";

interface HeatmapViewProps {
  store: Store;
  heatmaps: ZoneHeatmap[];
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
  heatmap,
  floorPlan,
  zones,
  opacity,
  showZones,
}: {
  heatmap: ZoneHeatmap;
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

    const data = heatmap.heatmap_data;
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
  }, [heatmap, imgLoaded, opacity, showZones, zones]);

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

export function HeatmapView({ store, heatmaps, floorPlan, zones }: HeatmapViewProps) {
  const [selectedIdx, setSelectedIdx] = useState("0");
  const [opacity, setOpacity] = useState([0.55]);
  const [showZones, setShowZones] = useState(true);

  const latestHeatmap = heatmaps[parseInt(selectedIdx, 10)] || heatmaps[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mapa de Calor</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de Tráfico</CardTitle>
        </CardHeader>
        <CardContent>
          {!latestHeatmap ? (
            <div className="flex h-96 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Map className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium">Sin datos de heatmap</h3>
                <p className="mt-2 text-sm">
                  Sube un plano de la tienda y conecta cámaras para visualizar
                  patrones de tráfico.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-4">
                {heatmaps.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Periodo</Label>
                    <Select value={selectedIdx} onValueChange={setSelectedIdx}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {heatmaps.map((h, i) => (
                          <SelectItem key={h.id} value={String(i)}>
                            {new Date(h.timestamp).toLocaleString("es", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
              </div>

              <HeatmapCanvas
                heatmap={latestHeatmap}
                floorPlan={floorPlan || null}
                zones={zones || []}
                opacity={opacity[0]}
                showZones={showZones}
              />

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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
