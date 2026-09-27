/**
 * Importación de transacciones POS desde CSV (HU-19). Acepta los formatos habituales
 * de los exports: separador ";" o ",", encabezados en español o inglés, montos con
 * coma decimal ("1.234,56") y fechas "AAAA-MM-DD" o "DD/MM/AAAA", con o sin hora.
 */

import { localMidnight } from "@/lib/dates";

export interface ParsedTransaction {
  timestamp: string;
  amount: number;
  items_count: number;
}

export interface RowError {
  line: number;
  message: string;
}

export interface ParseResult {
  rows: ParsedTransaction[];
  errors: RowError[];
  /** Columnas obligatorias que faltan en el encabezado (si hay, no se procesa nada). */
  missingColumns: string[];
}

const COLUMN_ALIASES: Record<"date" | "time" | "amount" | "items", string[]> = {
  date: ["fecha", "fecha_hora", "fecha y hora", "fechahora", "timestamp", "date", "datetime"],
  time: ["hora", "time"],
  amount: ["monto", "importe", "total", "amount"],
  items: ["items", "cantidad", "cantidad_items", "cantidad de items", "items_count", "unidades"],
};

const normalize = (value: string) =>
  value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Divide una línea CSV respetando comillas ("a;b" y comillas dobles escapadas). */
function splitLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

/** "1.234,56" → 1234.56 · "1234.56" → 1234.56 · "$ 12.500" → 12500 */
export function parseAmount(raw: string): number | null {
  let value = raw.replace(/[$\s]/g, "");
  if (!value) return null;
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // El último separador es el decimal
    value = lastComma > lastDot ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, "");
  } else if (lastComma > -1) {
    value = value.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, ""); // "12.500" = doce mil quinientos
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/** Fecha y hora en la zona de la tienda → instante UTC (ISO). null si no es válida. */
export function parseDateTime(rawDate: string, rawTime: string, timeZone: string): string | null {
  const text = `${rawDate} ${rawTime}`.trim().replace("T", " ");

  // Con zona horaria explícita (ISO completo): se respeta tal cual
  if (/(z|[+-]\d{2}:?\d{2})$/i.test(rawDate.trim())) {
    const instant = new Date(rawDate.trim());
    return isNaN(instant.getTime()) ? null : instant.toISOString();
  }

  const match =
    text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/) ||
    text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;

  const isoOrder = match[1].length === 4;
  const [year, month, day] = isoOrder
    ? [Number(match[1]), Number(match[2]), Number(match[3])]
    : [Number(match[3]), Number(match[2]), Number(match[1])];
  const [hours, minutes, seconds] = [Number(match[4] ?? 0), Number(match[5] ?? 0), Number(match[6] ?? 0)];

  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const check = new Date(`${date}T00:00:00Z`);
  if (
    isNaN(check.getTime()) ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day ||
    hours > 23 ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }

  const midnight = localMidnight(date, timeZone).getTime();
  return new Date(midnight + ((hours * 60 + minutes) * 60 + seconds) * 1000).toISOString();
}

export function parseTransactionsCsv(text: string, timeZone: string, now = new Date()): ParseResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const headerIndex = lines.findIndex((l) => l.trim() !== "");
  if (headerIndex === -1) return { rows: [], errors: [], missingColumns: ["fecha", "monto"] };

  const headerLine = lines[headerIndex];
  const separator = (headerLine.match(/;/g) || []).length >= (headerLine.match(/,/g) || []).length ? ";" : ",";
  const headers = splitLine(headerLine, separator).map(normalize);
  const column = (key: keyof typeof COLUMN_ALIASES) =>
    headers.findIndex((h) => COLUMN_ALIASES[key].includes(h));

  const idx = { date: column("date"), time: column("time"), amount: column("amount"), items: column("items") };
  const missingColumns = [
    ...(idx.date === -1 ? ["fecha"] : []),
    ...(idx.amount === -1 ? ["monto"] : []),
  ];
  if (missingColumns.length) return { rows: [], errors: [], missingColumns };

  const rows: ParsedTransaction[] = [];
  const errors: RowError[] = [];
  const latestAllowed = now.getTime() + 5 * 60 * 1000;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === "") continue;
    const line = i + 1; // número de línea del archivo, como lo ve el usuario
    const cells = splitLine(lines[i], separator);

    const rawDate = cells[idx.date] ?? "";
    const rawTime = idx.time > -1 ? cells[idx.time] ?? "" : "";
    const timestamp = parseDateTime(rawDate, rawTime, timeZone);
    if (!timestamp) {
      errors.push({ line, message: `Fecha u hora inválida: "${`${rawDate} ${rawTime}`.trim()}"` });
      continue;
    }
    if (new Date(timestamp).getTime() > latestAllowed) {
      errors.push({ line, message: "La fecha es posterior a hoy" });
      continue;
    }

    const amount = parseAmount(cells[idx.amount] ?? "");
    if (amount === null || amount <= 0) {
      errors.push({ line, message: `Monto inválido: "${cells[idx.amount] ?? ""}"` });
      continue;
    }

    let itemsCount = 1;
    if (idx.items > -1 && (cells[idx.items] ?? "") !== "") {
      itemsCount = Number(cells[idx.items]);
      if (!Number.isInteger(itemsCount) || itemsCount < 1) {
        errors.push({ line, message: `Cantidad de ítems inválida: "${cells[idx.items]}"` });
        continue;
      }
    }

    rows.push({ timestamp, amount: Math.round(amount * 100) / 100, items_count: itemsCount });
  }

  return { rows, errors, missingColumns: [] };
}
