/**
 * Franjas horarias y ventanas de tiempo del mapa de calor (HU-14).
 * Las horas se interpretan en la zona horaria de la tienda.
 */

import { localMidnight } from "@/lib/dates";

export const HEATMAP_SLOTS = {
  all: { label: "Todo el día", from: 0, to: 24 },
  morning: { label: "Mañana (8 a 12 h)", from: 8, to: 12 },
  midday: { label: "Mediodía (12 a 16 h)", from: 12, to: 16 },
  afternoon: { label: "Tarde (16 a 20 h)", from: 16, to: 20 },
  night: { label: "Noche (20 a 24 h)", from: 20, to: 24 },
} as const;

export type HeatmapSlot = keyof typeof HEATMAP_SLOTS;

export function isHeatmapSlot(value: unknown): value is HeatmapSlot {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(HEATMAP_SLOTS, value);
}

/** Ventana [from, to) en UTC que corresponde a la franja de esa fecha en la tienda. */
export function slotWindow(date: string, slot: HeatmapSlot, timeZone: string): { from: Date; to: Date } {
  const midnight = localMidnight(date, timeZone).getTime();
  const { from, to } = HEATMAP_SLOTS[slot];
  return { from: new Date(midnight + from * 3600000), to: new Date(midnight + to * 3600000) };
}

/** Suma celda a celda las grillas de calor de la ventana (se ignoran las de otra resolución). */
export function sumGrids(grids: number[][][]): number[][] | null {
  const valid = grids.filter((g) => Array.isArray(g) && g.length > 0 && Array.isArray(g[0]));
  if (valid.length === 0) return null;
  const rows = valid[0].length;
  const cols = valid[0][0].length;
  const total = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (const grid of valid) {
    if (grid.length !== rows || grid[0].length !== cols) continue;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) total[r][c] += Number(grid[r][c]) || 0;
    }
  }
  return total;
}

function pointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { x: xi, y: yi } = polygon[i];
    const { x: xj, y: yj } = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Intensidad de tráfico de una zona: promedio de las celdas de la grilla cuyo centro cae
 * dentro del polígono (grilla y polígono usan las mismas coordenadas normalizadas 0-1).
 * Se usa el promedio y no la suma para que una zona grande no aparezca como "caliente"
 * solo por su tamaño.
 */
export function zoneIntensity(grid: number[][], polygon: { x: number; y: number }[]): number {
  if (!polygon || polygon.length < 3) return 0;
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  let total = 0;
  let cells = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (pointInPolygon((c + 0.5) / cols, (r + 0.5) / rows, polygon)) {
        total += grid[r][c];
        cells++;
      }
    }
  }
  return cells > 0 ? total / cells : 0;
}
