/** Fechas en la zona horaria de la tienda (las tiendas guardan su zona en stores.timezone). */

export const DEFAULT_TIMEZONE = "America/Argentina/Cordoba";

/** Zona horaria de una tienda (la de Córdoba si no tiene una cargada). */
export function storeTimeZone(store: { timezone?: string | null } | null | undefined): string {
  return store?.timezone || DEFAULT_TIMEZONE;
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

/** Fecha (AAAA-MM-DD) de un instante en la zona horaria de la tienda. */
export function localDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Hora del día (0 a 23) de un instante en la zona horaria de la tienda. */
export function localHour(instant: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(instant)
  );
}

/** Día de la semana (0 = domingo) de una fecha AAAA-MM-DD. */
export function weekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Desplazamiento UTC de la zona horaria en esa fecha, por ejemplo "-03:00". */
function utcOffset(date: string, timeZone: string): string {
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
      .formatToParts(new Date(`${date}T12:00:00Z`))
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return "+00:00";
  return `${match[1]}${match[2].padStart(2, "0")}:${match[3] ?? "00"}`;
}

/** Instante UTC de las 00:00 de esa fecha en la zona horaria de la tienda. */
export function localMidnight(date: string, timeZone: string): Date {
  return new Date(`${date}T00:00:00${utcOffset(date, timeZone)}`);
}

/** Ventana [from, to) en UTC desde el inicio de un día hasta el final de otro, en la zona de la tienda. */
export function dayRange(fromDate: string, toDate: string, timeZone: string): { from: Date; to: Date } {
  return {
    from: localMidnight(fromDate, timeZone),
    to: new Date(localMidnight(toDate, timeZone).getTime() + 24 * 3600000),
  };
}

/** Suma días a una fecha AAAA-MM-DD (sin zona horaria: es aritmética de calendario). */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

/** Cantidad de días entre dos fechas AAAA-MM-DD, contando ambas. */
export function daysInclusive(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
}
