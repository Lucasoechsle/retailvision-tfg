import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";
import { canAccessStoreModule } from "@/lib/auth/roles";
import { localDate, storeTimeZone } from "@/lib/dates";
import { campaignStatus } from "@/lib/campaigns";
import { campaignDatesError, createCampaignSchema } from "@/lib/schemas/campaign";

/** Campañas de una tienda (?storeId), con el estado que corresponde a sus fechas. */
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "Falta la tienda (storeId)" }, { status: 400 });

  const auth = await authorizeStore(storeId);
  if (auth.error) return auth.error;
  if (!canAccessStoreModule(auth.session.role, "promos")) {
    return NextResponse.json({ error: "Tu perfil no tiene acceso a las promociones" }, { status: 403 });
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, zones(name, color)")
    .eq("store_id", storeId)
    .order("start_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const today = localDate(new Date(), storeTimeZone(auth.store));
  return NextResponse.json({
    campaigns: (data || []).map((c) => ({ ...c, status: campaignStatus(c, today) })),
  });
}

/** HU-17: alta de campaña; el estado se asigna según sus fechas. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const datesError = campaignDatesError(parsed.data);
  if (datesError) return NextResponse.json({ error: datesError }, { status: 400 });

  // Gestión de campañas: administrador y gerente de categoría
  const auth = await authorizeStore(parsed.data.store_id, "manage_campaigns");
  if (auth.error) return auth.error;

  const supabase = createClient();
  if (parsed.data.zone_id) {
    const { data: zone } = await supabase
      .from("zones")
      .select("id")
      .eq("id", parsed.data.zone_id)
      .eq("store_id", parsed.data.store_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!zone) return NextResponse.json({ error: "La zona no pertenece a esta tienda" }, { status: 400 });
  }

  const today = localDate(new Date(), storeTimeZone(auth.store));
  const status = campaignStatus({ ...parsed.data, status: "planned" }, today);

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      ...parsed.data,
      zone_id: parsed.data.zone_id ?? null,
      description: parsed.data.description ?? null,
      campaign_type: parsed.data.campaign_type ?? "promo",
      product_category: parsed.data.product_category ?? null,
      promo_cost: parsed.data.promo_cost ?? null,
      status,
    })
    .select("*, zones(name, color)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign }, { status: 201 });
}
