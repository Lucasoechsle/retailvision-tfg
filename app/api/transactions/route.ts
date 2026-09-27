import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { authorizeStore } from "@/lib/auth/api";

const transactionSchema = z.object({
  store_id: z.string().uuid(),
  amount: z.number().min(0),
  items_count: z.number().int().min(1),
  source: z.string().default("manual"),
  timestamp: z.string().datetime().optional(),
});

const batchSchema = z.object({
  transactions: z.array(transactionSchema),
});

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("X-API-Key") || request.headers.get("X-Device-Key");
  const body = await request.json();

  // ── Vía 1: ingesta automática por API key (POS / importación CSV en lote) ──
  if (apiKey) {
    const supabase = createAdminClient();
    const { data: device } = await supabase
      .from("devices")
      .select("id, store_id")
      .eq("api_key", apiKey)
      .single();

    if (!device) {
      return NextResponse.json({ error: "API key inválida" }, { status: 401 });
    }

    if (body.transactions) {
      const parsed = batchSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }
      const records = parsed.data.transactions.map((t) => ({
        store_id: t.store_id || device.store_id,
        amount: t.amount,
        items_count: t.items_count,
        source: t.source,
        timestamp: t.timestamp || new Date().toISOString(),
      }));
      const { error } = await supabase.from("transactions").insert(records);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, count: records.length });
    }

    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { error } = await supabase.from("transactions").insert({
      store_id: parsed.data.store_id || device.store_id,
      amount: parsed.data.amount,
      items_count: parsed.data.items_count,
      source: parsed.data.source,
      timestamp: parsed.data.timestamp || new Date().toISOString(),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Vía 2: carga manual desde el dashboard (sesión de usuario autenticado) ──
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // HU-19: carga de transacciones POS (administrador y gerente de categoría)
  const auth = await authorizeStore(parsed.data.store_id, "load_transactions");
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const { error } = await admin.from("transactions").insert({
    store_id: parsed.data.store_id,
    amount: parsed.data.amount,
    items_count: parsed.data.items_count,
    source: parsed.data.source || "manual",
    timestamp: parsed.data.timestamp || new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
