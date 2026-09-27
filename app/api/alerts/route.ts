import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { authorizeStore } from "@/lib/auth/api";

const createAlertRuleSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().min(1),
  rule_type: z.enum(["queue_length", "occupancy", "zone_empty", "device_offline", "traffic_anomaly"]),
  config: z.record(z.string(), z.unknown()),
  notify_channels: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const storeId = request.nextUrl.searchParams.get("storeId");

  let query = supabase.from("alert_rules").select("*").eq("is_active", true);
  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rules: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createAlertRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // HU-21: solo el administrador configura reglas de alerta
  const auth = await authorizeStore(parsed.data.store_id, "manage_alert_rules");
  if (auth.error) return auth.error;

  const supabase = createClient();

  const { data: rule, error } = await supabase
    .from("alert_rules")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule }, { status: 201 });
}
