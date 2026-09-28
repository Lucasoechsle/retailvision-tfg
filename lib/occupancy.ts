/** Ocupación de la tienda frente al aforo máximo configurado (HU-09). */

export interface StoreOccupancy {
  /** Personas dentro según el último registro de conteo. */
  current_inside: number;
  /** Momento del último registro de conteo (ISO), o null si no hay registros. */
  updated_at: string | null;
  /** Entradas y salidas acumuladas del día, en la zona horaria de la tienda. */
  today: { date: string; entries: number; exits: number };
  /** Aforo máximo: umbral de la regla de alerta de ocupación activa, o null si no hay. */
  max_capacity: number | null;
}

export type OccupancyLevel = "normal" | "warning" | "critical" | "over";

/** Porcentaje del aforo a partir del cual se avisa que la tienda se acerca al máximo. */
export const OCCUPANCY_WARNING_PCT = 75;
/** Porcentaje del aforo a partir del cual la situación es crítica. */
export const OCCUPANCY_CRITICAL_PCT = 90;

export const OCCUPANCY_LEVELS: Record<OccupancyLevel, { label: string; description: string }> = {
  normal: { label: "Normal", description: "Hay margen hasta el aforo." },
  warning: { label: "Cerca del aforo", description: `Supera el ${OCCUPANCY_WARNING_PCT} % del aforo máximo.` },
  critical: { label: "Aforo casi completo", description: `Supera el ${OCCUPANCY_CRITICAL_PCT} % del aforo máximo.` },
  over: { label: "Aforo superado", description: "Hay más personas que el aforo máximo." },
};

export function occupancyLevel(inside: number, maxCapacity: number): OccupancyLevel {
  const pct = (inside / maxCapacity) * 100;
  if (pct > 100) return "over";
  if (pct >= OCCUPANCY_CRITICAL_PCT) return "critical";
  if (pct >= OCCUPANCY_WARNING_PCT) return "warning";
  return "normal";
}
