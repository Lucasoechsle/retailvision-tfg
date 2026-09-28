"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatStoreDateTime, formatStoreTime } from "@/lib/dates";
import {
  OCCUPANCY_CRITICAL_PCT,
  OCCUPANCY_LEVELS,
  OCCUPANCY_WARNING_PCT,
  occupancyLevel,
  type OccupancyLevel,
  type StoreOccupancy,
} from "@/lib/occupancy";

/** Cada cuánto se vuelve a consultar la ocupación (HU-09: cada 60 segundos). */
const REFRESH_MS = 60_000;

const LEVEL_STYLES: Record<OccupancyLevel, { bar: string; text: string; badge: string }> = {
  normal: { bar: "bg-emerald-500", text: "text-emerald-500", badge: "border-emerald-500/40 text-emerald-500" },
  warning: { bar: "bg-amber-500", text: "text-amber-500", badge: "border-amber-500/40 text-amber-500" },
  critical: { bar: "bg-red-500", text: "text-red-500", badge: "border-red-500/40 text-red-500" },
  over: { bar: "bg-red-600", text: "text-red-600", badge: "border-red-600/50 bg-red-600/10 text-red-600" },
};

const count = (value: number) => value.toLocaleString("es-AR");

interface OccupancyPanelProps {
  storeId: string;
  timeZone: string;
  initial: StoreOccupancy;
  /** Momento en que el servidor calculó `initial` (ISO). */
  fetchedAt: string;
  /** El perfil puede crear la regla de ocupación que define el aforo. */
  canManageRules: boolean;
}

/**
 * HU-09: ocupación actual del local, entradas y salidas acumuladas del día e indicador de
 * proximidad al aforo máximo configurado. Se actualiza sola cada 60 segundos.
 */
export function OccupancyPanel({ storeId, timeZone, initial, fetchedAt, canManageRules }: OccupancyPanelProps) {
  const [data, setData] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(fetchedAt);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch(`/api/analytics/${storeId}/occupancy`, { cache: "no-store" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "No se pudo actualizar la ocupación");
        if (cancelled) return;
        setData(body);
        setCheckedAt(new Date().toISOString());
        setError(null);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "No se pudo actualizar la ocupación");
      }
    };
    const timer = setInterval(refresh, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [storeId]);

  const max = data.max_capacity;
  const pct = max ? (data.current_inside / max) * 100 : null;
  const level = max ? occupancyLevel(data.current_inside, max) : null;
  const styles = level ? LEVEL_STYLES[level] : null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-muted-foreground">Ocupación actual</p>
              {level && styles && (
                <Badge variant="outline" className={styles.badge}>
                  {OCCUPANCY_LEVELS[level].label}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-4xl font-bold tabular-nums tracking-tight">{count(data.current_inside)}</span>
              <span className="text-muted-foreground">
                {max ? `de ${count(max)} personas de aforo máximo` : "personas dentro"}
              </span>
            </div>

            {max && pct != null && level && styles ? (
              <>
                <div
                  role="progressbar"
                  aria-label="Ocupación respecto del aforo máximo"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(Math.min(pct, 100))}
                  className="relative h-3 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500", styles.bar)}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                  {/* Marcas de los umbrales de aviso */}
                  {[OCCUPANCY_WARNING_PCT, OCCUPANCY_CRITICAL_PCT].map((mark) => (
                    <span
                      key={mark}
                      aria-hidden
                      className="absolute inset-y-0 w-0.5 bg-background"
                      style={{ left: `${mark}%` }}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className={cn("font-medium", styles.text)}>{Math.round(pct)} % del aforo</span>
                  {" · "}
                  {OCCUPANCY_LEVELS[level].description}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin aforo máximo configurado.{" "}
                {canManageRules ? (
                  <Link href="/alerts" className="font-medium text-foreground underline">
                    Definilo con una regla de ocupación en Alertas
                  </Link>
                ) : (
                  "Lo define el administrador con una regla de ocupación."
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:w-72">
            <div className="rounded-lg border p-4">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3.5 w-3.5" />
                Entradas hoy
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{count(data.today.entries)}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowDownRight className="h-3.5 w-3.5" />
                Salidas hoy
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{count(data.today.exits)}</p>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          {data.updated_at
            ? `Último registro de la cámara: ${formatStoreDateTime(data.updated_at, timeZone)}`
            : "Todavía no hay registros de conteo"}
          {` · se actualiza cada 60 s (última consulta ${formatStoreTime(checkedAt, timeZone)})`}
          {error && <span className="text-destructive"> · {error}</span>}
        </p>
      </CardContent>
    </Card>
  );
}
