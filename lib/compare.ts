/** Comparación de indicadores contra un período anterior (conversión, tráfico). */

/** Variación porcentual contra el período anterior; null si no hay base de comparación. */
export function variation(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Props de MetricCard para mostrar una variación en % o en puntos porcentuales. */
export function changeProps(delta: number | null, unit: "%" | "pp") {
  if (delta == null) return { change: undefined, changeType: "neutral" as const };
  const sign = delta > 0 ? "+" : "";
  return {
    change: `${sign}${delta.toFixed(1)}${unit === "pp" ? " pp" : "%"}`,
    changeType: delta > 0 ? ("positive" as const) : delta < 0 ? ("negative" as const) : ("neutral" as const),
  };
}
