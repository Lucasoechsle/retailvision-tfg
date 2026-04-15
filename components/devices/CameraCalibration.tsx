"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  VideoOff,
  Check,
  ArrowRight,
  ArrowLeft,
  Pencil,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Camera,
} from "lucide-react";
import { toast } from "sonner";

interface Point {
  x: number;
  y: number;
}

interface CountingLine {
  start: Point;
  end: Point;
  entry_direction: string;
}

interface ZoneDraft {
  name: string;
  zone_type: string;
  color: string;
  polygon: Point[];
}

interface DeviceConfig {
  device_id: string;
  store_id: string;
  device_name: string;
  config: Record<string, unknown>;
  status: string;
  stream_url: string | null;
  zones: Array<{
    id: string;
    name: string;
    zone_type: string;
    polygon: Point[];
    color: string;
  }>;
}

const ZONE_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
];

const ZONE_TYPES = [
  { value: "gondola", label: "Góndola" },
  { value: "aisle", label: "Pasillo" },
  { value: "checkout", label: "Caja" },
  { value: "entrance", label: "Entrada" },
  { value: "promo", label: "Promoción" },
  { value: "endcap", label: "Cabecera" },
  { value: "other", label: "Otro" },
];

type Step = "preview" | "line" | "zones";

interface CameraCalibrationProps {
  deviceId: string;
  storeId: string;
}

export function CameraCalibration({ deviceId, storeId }: CameraCalibrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState<Step>("preview");
  const [deviceConfig, setDeviceConfig] = useState<DeviceConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // WebSocket & feed
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastFrame, setLastFrame] = useState<HTMLImageElement | null>(null);
  const [frozenFrame, setFrozenFrame] = useState<HTMLImageElement | null>(null);

  // Counting line
  const [lineStart, setLineStart] = useState<Point | null>(null);
  const [lineEnd, setLineEnd] = useState<Point | null>(null);
  const [entryDirection, setEntryDirection] = useState("top_to_bottom");
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  // Zones
  const [zoneDrafts, setZoneDrafts] = useState<ZoneDraft[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [drawingZone, setDrawingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneType, setNewZoneType] = useState("gondola");

  const [saving, setSaving] = useState(false);

  // Fetch device config
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/devices/${deviceId}/config`);
        if (res.ok) {
          const data: DeviceConfig = await res.json();
          setDeviceConfig(data);

          const cfg = data.config as Record<string, unknown>;
          const line = cfg?.counting_line as CountingLine | undefined;
          if (line) {
            setLineStart(line.start);
            setLineEnd(line.end);
            setEntryDirection(line.entry_direction || "top_to_bottom");
          }
        }
      } catch (err) {
        toast.error("Error cargando configuración del dispositivo");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [deviceId]);

  // WebSocket connection
  const connectStream = useCallback(() => {
    if (!deviceConfig?.stream_url) return;

    const ws = new WebSocket(deviceConfig.stream_url);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const blob = new Blob([event.data], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        setLastFrame(img);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    };
  }, [deviceConfig?.stream_url]);

  const disconnectStream = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const frameToUse = step === "preview" ? lastFrame : frozenFrame;
    if (!frameToUse) {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#555";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        connected ? "Esperando frame..." : "Sin conexión al dispositivo",
        canvas.width / 2,
        canvas.height / 2
      );
      return;
    }

    canvas.width = frameToUse.naturalWidth;
    canvas.height = frameToUse.naturalHeight;
    ctx.drawImage(frameToUse, 0, 0);

    const w = canvas.width;
    const h = canvas.height;

    // Draw counting line
    if (step === "line" && lineStart && lineEnd) {
      ctx.beginPath();
      ctx.moveTo(lineStart.x * w, lineStart.y * h);
      ctx.lineTo(lineEnd.x * w, lineEnd.y * h);
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draggable handles
      for (const pt of [lineStart, lineEnd]) {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 10, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 255, 255, 0.8)";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Direction arrow at midpoint
      const mx = ((lineStart.x + lineEnd.x) / 2) * w;
      const my = ((lineStart.y + lineEnd.y) / 2) * h;
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;

      let nx: number, ny: number;
      if (entryDirection === "bottom_to_top") {
        nx = dy; ny = -dx;
      } else {
        nx = -dy; ny = dx;
      }
      const mag = Math.sqrt(nx * nx + ny * ny) || 1;
      nx /= mag; ny /= mag;

      const arrowLen = 40;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx + nx * arrowLen * (w / 640), my + ny * arrowLen * (h / 480));
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#00FF00";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("ENTRADA ➜", mx + nx * 50 * (w / 640), my + ny * 50 * (h / 480));
    }

    // Draw existing + draft zones
    if (step === "zones") {
      const allZones = [
        ...(deviceConfig?.zones || []).map((z) => ({
          name: z.name,
          polygon: z.polygon,
          color: z.color,
          existing: true,
        })),
        ...zoneDrafts.map((z) => ({
          name: z.name,
          polygon: z.polygon,
          color: z.color,
          existing: false,
        })),
      ];

      for (const zone of allZones) {
        if (zone.polygon.length < 2) continue;
        ctx.beginPath();
        ctx.moveTo(zone.polygon[0].x * w, zone.polygon[0].y * h);
        for (let i = 1; i < zone.polygon.length; i++) {
          ctx.lineTo(zone.polygon[i].x * w, zone.polygon[i].y * h);
        }
        ctx.closePath();
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = zone.color + "33";
        ctx.fill();

        const cx = zone.polygon.reduce((s, p) => s + p.x, 0) / zone.polygon.length;
        const cy = zone.polygon.reduce((s, p) => s + p.y, 0) / zone.polygon.length;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(zone.name, cx * w, cy * h);
      }

      // Drawing in progress
      if (currentPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x * w, currentPoints[0].y * h);
        for (let i = 1; i < currentPoints.length; i++) {
          ctx.lineTo(currentPoints[i].x * w, currentPoints[i].y * h);
        }
        ctx.strokeStyle = "#FFD700";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        for (const pt of currentPoints) {
          ctx.beginPath();
          ctx.arc(pt.x * w, pt.y * h, 6, 0, Math.PI * 2);
          ctx.fillStyle = "#FFD700";
          ctx.fill();
        }
      }
    }
  }, [step, lastFrame, frozenFrame, lineStart, lineEnd, entryDirection, dragging, deviceConfig, zoneDrafts, currentPoints]);

  // Canvas mouse handlers
  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const distToPoint = (a: Point, b: Point): number => {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const pt = getCanvasPoint(e);

    if (step === "line") {
      if (lineStart && distToPoint(pt, lineStart) < 0.03) {
        setDragging("start");
      } else if (lineEnd && distToPoint(pt, lineEnd) < 0.03) {
        setDragging("end");
      } else if (!lineStart) {
        setLineStart(pt);
      } else if (!lineEnd) {
        setLineEnd(pt);
      }
    }

    if (step === "zones" && drawingZone) {
      setCurrentPoints((prev) => [...prev, pt]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (step !== "line" || !dragging) return;
    const pt = getCanvasPoint(e);
    if (dragging === "start") setLineStart(pt);
    if (dragging === "end") setLineEnd(pt);
  };

  const handleCanvasMouseUp = () => {
    setDragging(null);
  };

  // Freeze frame and go to next step
  const handleFreezeAndNext = (nextStep: Step) => {
    if (lastFrame) {
      setFrozenFrame(lastFrame);
    }
    disconnectStream();
    setStep(nextStep);
  };

  // Save counting line
  const saveCountingLine = async () => {
    if (!lineStart || !lineEnd) {
      toast.error("Dibuja la línea de conteo primero");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/devices/${deviceId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counting_line: {
            start: lineStart,
            end: lineEnd,
            entry_direction: entryDirection,
          },
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Línea de conteo guardada. El dispositivo la cargará en ~60s.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Finish drawing zone polygon
  const finishZone = () => {
    if (currentPoints.length < 3) {
      toast.error("Una zona necesita al menos 3 puntos");
      return;
    }
    if (!newZoneName.trim()) {
      toast.error("Dale un nombre a la zona");
      return;
    }

    setZoneDrafts((prev) => [
      ...prev,
      {
        name: newZoneName.trim(),
        zone_type: newZoneType,
        color: ZONE_COLORS[prev.length % ZONE_COLORS.length],
        polygon: currentPoints,
      },
    ]);
    setCurrentPoints([]);
    setNewZoneName("");
    setDrawingZone(false);
  };

  // Save all draft zones to backend
  const saveZones = async () => {
    if (zoneDrafts.length === 0) {
      toast.info("No hay zonas nuevas para guardar");
      return;
    }

    setSaving(true);
    let saved = 0;
    for (const zone of zoneDrafts) {
      try {
        const res = await fetch(`/api/stores/${storeId}/zones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: zone.name,
            zone_type: zone.zone_type,
            polygon: zone.polygon,
            color: zone.color,
          }),
        });
        if (res.ok) saved++;
      } catch {
        // continue with others
      }
    }

    toast.success(`${saved} zona(s) guardada(s)`);
    setZoneDrafts([]);
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Cargando configuración del dispositivo...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(["preview", "line", "zones"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => {
                if (s === "preview" && !connected) connectStream();
                setStep(s);
              }}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs">
                {i + 1}
              </span>
              {s === "preview" && "Preview"}
              {s === "line" && "Línea de Conteo"}
              {s === "zones" && "Zonas"}
            </button>
            {i < 2 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Canvas */}
        <Card>
          <CardContent className="p-2">
            <div className="relative overflow-hidden rounded-lg bg-black">
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="w-full cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              <div className="absolute left-3 top-3 flex items-center gap-2">
                {connected ? (
                  <Badge className="bg-green-600 text-white">
                    <Video className="mr-1 h-3 w-3" /> EN VIVO
                  </Badge>
                ) : frozenFrame ? (
                  <Badge variant="outline">
                    <Camera className="mr-1 h-3 w-3" /> Frame capturado
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <VideoOff className="mr-1 h-3 w-3" /> Desconectado
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Controls sidebar */}
        <div className="space-y-4">
          {/* Step: Preview */}
          {step === "preview" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">1. Preview de Cámara</CardTitle>
                <CardDescription>
                  Conectá al feed en vivo para verificar que la cámara apunta correctamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {deviceConfig?.stream_url ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Stream: {deviceConfig.stream_url}
                    </p>
                    {!connected ? (
                      <Button onClick={connectStream} className="w-full">
                        <Video className="mr-2 h-4 w-4" />
                        Conectar
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={disconnectStream}
                          className="w-full"
                        >
                          <VideoOff className="mr-2 h-4 w-4" />
                          Desconectar
                        </Button>
                        <Button
                          onClick={() => handleFreezeAndNext("line")}
                          className="w-full"
                          disabled={!lastFrame}
                        >
                          Capturar y Continuar
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>
                      El dispositivo no reportó su IP aún. Asegurate de que el edge
                      pipeline está corriendo y envió al menos un heartbeat.
                    </p>
                    <p className="text-xs">
                      Estado: <Badge variant="outline">{deviceConfig?.status || "desconocido"}</Badge>
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setStep("line");
                        toast.info("Podés configurar la línea sin feed en vivo usando coordenadas manuales.");
                      }}
                    >
                      Continuar sin feed
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step: Counting Line */}
          {step === "line" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">2. Línea de Conteo</CardTitle>
                <CardDescription>
                  Dibujá una línea que cruce la entrada. Cualquier persona que la cruce será contada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Hacé click en dos puntos sobre la imagen para definir la línea, o arrastrá los puntos existentes.
                </p>

                <div className="space-y-2">
                  <Label className="text-xs">Dirección de entrada</Label>
                  <Select value={entryDirection} onValueChange={setEntryDirection}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top_to_bottom">Arriba → Abajo = Entrada</SelectItem>
                      <SelectItem value="bottom_to_top">Abajo → Arriba = Entrada</SelectItem>
                      <SelectItem value="left_to_right">Izquierda → Derecha = Entrada</SelectItem>
                      <SelectItem value="right_to_left">Derecha → Izquierda = Entrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {lineStart && lineEnd && (
                  <div className="rounded bg-muted p-2 text-xs space-y-1">
                    <p>Inicio: ({lineStart.x.toFixed(2)}, {lineStart.y.toFixed(2)})</p>
                    <p>Fin: ({lineEnd.x.toFixed(2)}, {lineEnd.y.toFixed(2)})</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setLineStart(null); setLineEnd(null); }}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveCountingLine}
                    disabled={!lineStart || !lineEnd || saving}
                  >
                    <Save className="mr-1 h-3 w-3" />
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("zones")}
                >
                  Continuar a Zonas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step: Zones */}
          {step === "zones" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">3. Zonas</CardTitle>
                <CardDescription>
                  Dibujá polígonos sobre las áreas que querés trackear (góndolas, pasillos, cajas).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Existing zones */}
                {deviceConfig?.zones && deviceConfig.zones.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Zonas existentes</Label>
                    {deviceConfig.zones.map((z) => (
                      <div
                        key={z.id}
                        className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: z.color }}
                        />
                        <span className="flex-1">{z.name}</span>
                        <Badge variant="outline" className="text-[10px]">{z.zone_type}</Badge>
                      </div>
                    ))}
                  </div>
                )}

                {/* Draft zones */}
                {zoneDrafts.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Zonas nuevas (sin guardar)</Label>
                    {zoneDrafts.map((z, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded bg-muted px-2 py-1 text-xs"
                      >
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: z.color }}
                        />
                        <span className="flex-1">{z.name}</span>
                        <button
                          onClick={() => setZoneDrafts((prev) => prev.filter((_, j) => j !== i))}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!drawingZone ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDrawingZone(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Dibujar Zona
                  </Button>
                ) : (
                  <div className="space-y-2 rounded border p-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        placeholder="Ej: Góndola Bebidas"
                        value={newZoneName}
                        onChange={(e) => setNewZoneName(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={newZoneType} onValueChange={setNewZoneType}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ZONE_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Hacé click en la imagen para agregar puntos ({currentPoints.length} puntos).
                      Mínimo 3 para cerrar el polígono.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDrawingZone(false);
                          setCurrentPoints([]);
                          setNewZoneName("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={finishZone}
                        disabled={currentPoints.length < 3}
                      >
                        <Check className="mr-1 h-3 w-3" />
                        Cerrar Zona
                      </Button>
                    </div>
                  </div>
                )}

                {zoneDrafts.length > 0 && (
                  <Button
                    className="w-full"
                    onClick={saveZones}
                    disabled={saving}
                  >
                    <Save className="mr-1 h-4 w-4" />
                    {saving ? "Guardando..." : `Guardar ${zoneDrafts.length} zona(s)`}
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setStep("line")}
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Volver a Línea
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
