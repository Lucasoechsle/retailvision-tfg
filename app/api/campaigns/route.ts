import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { authorizeStore } from "@/lib/auth/api";

const createCampaignSchema = z.object({
  store_id: z.string().uuid(),
  zone_id: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional(),
  campaign_type: z.enum(["promo", "endcap", "island", "seasonal", "layout_change", "other"]).default("promo"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baseline_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  baseline_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const storeId = request.nextUrl.searchParams.get("storeId");

  let query = supabase
    .from("campaigns")
    .select("*, zones(name, color)")
    .order("start_date", { ascending: false });

  if (storeId) query = query.eq("store_id", storeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ campaigns: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // HU-17: gestión de campañas (administrador y gerente de categoría)
  const auth = await authorizeStore(parsed.data.store_id, "manage_campaigns");
  if (auth.error) return auth.error;

  const supabase = createClient();

  const today = new Date().toISOString().split("T")[0];
  let status = "planned";
  if (parsed.data.start_date <= today && parsed.data.end_date >= today) status = "active";
  else if (parsed.data.end_date < today) status = "completed";

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({ ...parsed.data, status })
    .select("*, zones(name, color)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign }, { status: 201 });
}
