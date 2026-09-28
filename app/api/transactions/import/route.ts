import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";
import { parseTransactionsCsv } from "@/lib/transactions/csv";
import { storeTimeZone } from "@/lib/dates";

const MAX_BYTES = 1024 * 1024;
const MAX_ROWS = 5000;

const importSchema = z.object({
  store_id: z.string().uuid(),
  csv: z.string().min(1, "El archivo está vacío"),
});

/**
 * HU-19: importa transacciones POS desde un CSV. Valida las columnas del encabezado
 * y cada fila; registra las válidas y devuelve el detalle de las rechazadas.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  if (parsed.data.csv.length > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera 1 MB" }, { status: 413 });
  }

  const auth = await authorizeStore(parsed.data.store_id, "load_transactions");
  if (auth.error) return auth.error;

  const timeZone = storeTimeZone(auth.store);
  const result = parseTransactionsCsv(parsed.data.csv, timeZone);

  if (result.missingColumns.length) {
    return NextResponse.json(
      {
        error: `Faltan columnas obligatorias: ${result.missingColumns.join(", ")}. El encabezado debe incluir fecha y monto (ítems es opcional).`,
      },
      { status: 400 }
    );
  }
  if (result.rows.length + result.errors.length > MAX_ROWS) {
    return NextResponse.json({ error: `El archivo supera las ${MAX_ROWS} filas` }, { status: 413 });
  }

  const supabase = createClient();
  const records = result.rows.map((row) => ({
    store_id: parsed.data.store_id,
    timestamp: row.timestamp,
    amount: row.amount,
    items_count: row.items_count,
    source: "csv_import",
  }));

  for (let i = 0; i < records.length; i += 500) {
    const { error } = await supabase.from("transactions").insert(records.slice(i, i + 500));
    if (error) {
      return NextResponse.json(
        { error: `Error al registrar las transacciones: ${error.message}`, imported: i },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    imported: records.length,
    rejected: result.errors.length,
    errors: result.errors.slice(0, 50),
  });
}
