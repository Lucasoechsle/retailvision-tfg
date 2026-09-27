"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Save, MousePointer2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Zone, FloorPlan } from "@/types";

const ZONE_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
];

const ZONE_TYPES = [
  { value: "aisle", label: "Pasillo" },
  { value: "gondola", label: "Góndola" },
  { value: "checkout", label: "Caja" },
  { value: "entrance", label: "Entrada" },
  { value: "promo", label: "Promoción" },
  { value: "endcap", label: "Cabecera" },
  { value: "storage", label: "Depósito" },
  { value: "other", label: "Otro" },
];

interface ZoneEditorProps {
  storeId: string;
  floorPlan: FloorPlan | null;
  zones: Zone[];
  onZoneSaved?: () => void;
}

type Point = { x: number; y: number };
type EditorMode = "select" | "draw";

export function ZoneEditor({ storeId, floorPlan, zones, onZoneSaved }: ZoneEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<EditorMode>("select");
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneType, setNewZoneType] = useState("aisle");
  const [newZoneColor, setNewZoneColor] = useState(ZONE_COLORS[0]);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [saving, setSaving] = useState(false);
  // Zona cuya forma se está redibujando (null = se está dibujando una zona nueva)
  const [redrawZone, setRedrawZone] = useState<Zone | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("aisle");
  const [editColor, setEditColor] = useState(ZONE_COLORS[0]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Cuando se recargan las zonas, la selección apunta a la versión actualizada
  useEffect(() => {
    setSelectedZone((prev) => (prev ? zones.find((z) => z.id === prev.id) ?? null : null));
  }, [zones]);

  // Al seleccionar una zona, se cargan sus datos en el formulario de edición
  useEffect(() => {
    if (selectedZone) {
      setEditName(selectedZone.name);
      setEditType(selectedZone.zone_type);
      setEditColor(selectedZone.color);
    }
  }, [selectedZone]);

  useEffect(() => {
    if (floorPlan?.image_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setBgImage(img);
        const container = containerRef.current;
        if (container) {
          const maxWidth = container.clientWidth;
          const scale = maxWidth / img.width;
          setCanvasSize({
            width: maxWidth,
            height: img.height * scale,
          });
        }
      };
      img.src = floorPlan.image_url;
    }
  }, [floorPlan]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgImage) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = themeColor("--muted", "#1e293b");
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (zones.length === 0) {
        ctx.fillStyle = themeColor("--muted-foreground", "#94a3b8");
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Sube un plano para comenzar", canvas.width / 2, canvas.height / 2);
      }
    }

    for (const zone of zones) {
      if (!zone.polygon || zone.polygon.length < 3) continue;
      const isSelected = selectedZone?.id === zone.id;

      ctx.beginPath();
      const first = zone.polygon[0];
      ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
      for (let i = 1; i < zone.polygon.length; i++) {
        ctx.lineTo(zone.polygon[i].x * canvas.width, zone.polygon[i].y * canvas.height);
      }
      ctx.closePath();

      ctx.fillStyle = zone.color + "33";
      ctx.fill();
      ctx.strokeStyle = isSelected ? "#fff" : zone.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      const cx = zone.polygon.reduce((s, p) => s + p.x, 0) / zone.polygon.length * canvas.width;
      const cy = zone.polygon.reduce((s, p) => s + p.y, 0) / zone.polygon.length * canvas.height;
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(zone.name, cx, cy);
    }

    if (currentPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x * canvas.width, currentPoints[0].y * canvas.height);
      for (let i = 1; i < currentPoints.length; i++) {
        ctx.lineTo(currentPoints[i].x * canvas.width, currentPoints[i].y * canvas.height);
      }
      ctx.strokeStyle = newZoneColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const point of currentPoints) {
        ctx.beginPath();
        ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fillStyle = newZoneColor;
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }, [zones, currentPoints, selectedZone, bgImage, newZoneColor]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, canvasSize]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    if (mode === "draw") {
      setCurrentPoints((prev) => [...prev, { x, y }]);
    } else {
      const clicked = zones.find((zone) => {
        if (!zone.polygon || zone.polygon.length < 3) return false;
        return isPointInPolygon({ x, y }, zone.polygon);
      });
      setSelectedZone(clicked || null);
    }
  };

  /** HU-08: modifica una zona existente; el edge toma el cambio sin reiniciarse. */
  const patchZone = async (zoneId: string, changes: Record<string, unknown>, successMessage: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/zones/${zoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error guardando la zona");
      toast.success(successMessage);
      onZoneSaved?.();
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateZone = () => {
    if (!selectedZone) return;
    if (!editName.trim()) {
      toast.error("Nombre de zona requerido");
      return;
    }
    patchZone(
      selectedZone.id,
      { name: editName.trim(), zone_type: editType, color: editColor },
      `Zona "${editName.trim()}" actualizada`
    );
  };

  const startRedraw = () => {
    if (!selectedZone) return;
    setRedrawZone(selectedZone);
    setCurrentPoints([]);
    setMode("draw");
  };

  const handleSaveZone = async () => {
    if (currentPoints.length < 3) {
      toast.error("Necesitas al menos 3 puntos para crear una zona");
      return;
    }
    if (redrawZone) {
      const ok = await patchZone(
        redrawZone.id,
        { polygon: currentPoints },
        `Forma de "${redrawZone.name}" actualizada`
      );
      if (ok) {
        setCurrentPoints([]);
        setRedrawZone(null);
        setMode("select");
      }
      return;
    }
    if (!newZoneName.trim()) {
      toast.error("Nombre de zona requerido");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/zones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newZoneName,
          zone_type: newZoneType,
          polygon: currentPoints,
          color: newZoneColor,
          floor_plan_id: floorPlan?.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error guardando zona");
      }

      toast.success(`Zona "${newZoneName}" creada`);
      setCurrentPoints([]);
      setNewZoneName("");
      setNewZoneType("aisle");
      setMode("select");
      onZoneSaved?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteZone = async (zone: Zone) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/zones/${zone.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error eliminando la zona");
      toast.success(`Zona "${zone.name}" eliminada. Su histórico se conserva.`);
      setConfirmDelete(false);
      setSelectedZone(null);
      onZoneSaved?.();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Canvas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Editor de Zonas</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={mode === "select" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("select")}
            >
              <MousePointer2 className="mr-1 h-4 w-4" />
              Seleccionar
            </Button>
            <Button
              variant={mode === "draw" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setMode("draw");
                setCurrentPoints([]);
                setSelectedZone(null);
                setRedrawZone(null);
              }}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Dibujar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="overflow-hidden rounded-lg border border-border">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onClick={handleCanvasClick}
              className={mode === "draw" ? "cursor-crosshair" : "cursor-pointer"}
            />
          </div>
          {mode === "draw" && currentPoints.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {currentPoints.length} puntos. Mín. 3 para guardar. Clic para agregar más.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sidebar */}
      <div className="space-y-4">
        {mode === "draw" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {redrawZone ? `Redibujar: ${redrawZone.name}` : "Nueva Zona"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {redrawZone ? (
                <p className="text-sm text-muted-foreground">
                  Marcá los vértices de la nueva forma sobre el plano (mínimo 3 puntos).
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      placeholder="Góndola Lácteos"
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select value={newZoneType} onValueChange={setNewZoneType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ZONE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <div className="flex flex-wrap gap-2">
                      {ZONE_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setNewZoneColor(c)}
                          className={`h-6 w-6 rounded-full border-2 ${
                            newZoneColor === c ? "border-white" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={handleSaveZone}
                  disabled={currentPoints.length < 3 || (!redrawZone && !newZoneName) || saving}
                  className="flex-1"
                >
                  <Save className="mr-1 h-4 w-4" />
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCurrentPoints([]);
                    setRedrawZone(null);
                    setMode("select");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* HU-08: edición de la zona seleccionada */}
        {mode === "select" && selectedZone && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Zona seleccionada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nombre</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={editType} onValueChange={setEditType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {ZONE_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Color ${c}`}
                      onClick={() => setEditColor(c)}
                      className={`h-6 w-6 rounded-full border-2 ${
                        editColor === c ? "border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <Button size="sm" className="w-full" onClick={handleUpdateZone} disabled={saving}>
                <Save className="mr-1 h-4 w-4" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={startRedraw}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Redibujar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Eliminar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                El dispositivo toma los cambios en su próxima consulta de configuración, sin reiniciarse.
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar la zona {selectedZone?.name}?</DialogTitle>
              <DialogDescription>
                La zona deja de analizarse y de enviarse al dispositivo, pero se conserva su
                histórico de visitas y permanencia.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => selectedZone && handleDeleteZone(selectedZone)}
              >
                {saving ? "Eliminando..." : "Eliminar zona"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Zone list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Zonas ({zones.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Usa el modo Dibujar para crear zonas
              </p>
            ) : (
              <div className="space-y-2">
                {zones.map((zone) => (
                  <div
                    key={zone.id}
                    onClick={() => {
                      setSelectedZone(zone);
                      setMode("select");
                    }}
                    className={`flex items-center justify-between rounded-lg border p-2 text-sm cursor-pointer transition-colors ${
                      selectedZone?.id === zone.id
                        ? "border-primary bg-accent"
                        : "border-border hover:bg-accent/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: zone.color }}
                      />
                      <span className="font-medium">{zone.name}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {ZONE_TYPES.find((t) => t.value === zone.zone_type)?.label || zone.zone_type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * El canvas no interpreta variables CSS: "hsl(var(--muted))" se ignora y el fondo
 * quedaba del último color usado. Se resuelve la variable al color concreto del tema.
 */
function themeColor(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value ? `hsl(${value.split(/\s+/).join(", ")})` : fallback;
}

function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
