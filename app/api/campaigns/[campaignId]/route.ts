import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorizeStore } from "@/lib/auth/api";
import { canAccessStoreModule } from "@/lib/auth/roles";
import { localDate, storeTimeZone } from "@/lib/dates";
import {
  campaignRoi,
  campaignStatus,
  liftAgainst,
  periodMetrics,
  postPeriod,
  type PeriodKey,
} from "@/lib/campaigns";
import { campaignDatesError, updateCampaignSchema } from "@/lib/schemas/campaign";

type Params = { params: { campaignId: string } };

async function loadCampaign(campaignId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("*, zones(id, name, color, zone_type)")
    .eq("id", campaignId)
    .maybeSingle();
  return data;
}

/**
 * HU-18: efectividad de la campaña. Compara tráfico, dwell time y engagement de los
 * períodos previo, activo y posterior, calcula el lift respecto del previo y, si hay
 * transacciones POS, estima el ROI con el costo de exhibición.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const campaign = await loadCampaign(params.campaignId);
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

  const auth = await authorizeStore(campaign.store_id);
  if (auth.error) return auth.error;
  if (!canAccessStoreModule(auth.session.role, "promos")) {
    return NextResponse.json({ error: "Tu perfil no tiene acceso a las promociones" }, { status: 403 });
  }

  const today = localDate(new Date(), storeTimeZone(auth.store));
  const status = campaignStatus(campaign, today);
  const post = postPeriod(campaign);
  const ranges: Record<PeriodKey, { from: string; to: string }> = {
    baseline: { from: campaign.baseline_start, to: campaign.baseline_end },
    campaign: { from: campaign.start_date, to: campaign.end_date },
    post,
  };

  // Resúmenes diarios de la tienda y de la zona de la campaña (o de todas, si no tiene zona)
  const supabase = createClient();
  const fetchPeriod = async ({ from, to }: { from: string; to: string }) => {
    let zoneQuery = supabase
      .from("daily_zone_summaries")
      .select("date, total_visits, avg_dwell_seconds, engagement_rate")
      .eq("store_id", campaign.store_id)
      .gte("date", from)
      .lte("date", to);
    if (campaign.zone_id) zoneQuery = zoneQuery.eq("zone_id", campaign.zone_id);
    const [storeRes, zoneRes] = await Promise.all([
      supabase
        .from("daily_store_summaries")
        .select("date, total_visitors, total_transactions, total_revenue")
        .eq("store_id", campaign.store_id)
        .gte("date", from)
        .lte("date", to)
        .order("date"),
      zoneQuery,
    ]);
    return { store: storeRes.data || [], zone: zoneRes.data || [] };
  };
  const [baselineRows, campaignRows, postRows] = await Promise.all([
    fetchPeriod(ranges.baseline),
    fetchPeriod(ranges.campaign),
    fetchPeriod(ranges.post),
  ]);

  const rows = { baseline: baselineRows, campaign: campaignRows, post: postRows };
  const metrics = (key: PeriodKey) =>
    periodMetrics(key, ranges[key].from, ranges[key].to, today, rows[key].store, rows[key].zone);
  const periods = { baseline: metrics("baseline"), campaign: metrics("campaign"), post: metrics("post") };
  const lift = {
    campaign: liftAgainst(periods.campaign, periods.baseline),
    post: liftAgainst(periods.post, periods.baseline),
  };
  const roi = campaignRoi(periods.baseline, periods.campaign, campaign.promo_cost != null ? Number(campaign.promo_cost) : null);

  const daily = (["baseline", "campaign", "post"] as PeriodKey[]).flatMap((key) =>
    rows[key].store.map((d: any) => ({
      date: d.date,
      period: key,
      visitors: d.total_visitors || 0,
      transactions: d.total_transactions || 0,
      revenue: Number(d.total_revenue || 0),
    }))
  );

  // Al finalizar, las métricas calculadas quedan guardadas en la campaña (results)
  if (status === "completed") {
    await supabase
      .from("campaigns")
      .update({ results: { computed_at: new Date().toISOString(), periods, lift, roi } })
      .eq("id", campaign.id);
  }

  return NextResponse.json({ campaign: { ...campaign, status }, today, periods, lift, roi, daily });
}

/** HU-17: edición de la campaña, baja (cancelled: true) o reactivación (cancelled: false). */
export async function PATCH(request: NextRequest, { params }: Params) {
  const campaign = await loadCampaign(params.campaignId);
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

  const auth = await authorizeStore(campaign.store_id, "manage_campaigns");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = updateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { cancelled, ...changes } = parsed.data;
  const merged = { ...campaign, ...changes };
  const datesError = campaignDatesError(merged);
  if (datesError) return NextResponse.json({ error: datesError }, { status: 400 });

  const supabase = createClient();
  if (changes.zone_id) {
    const { data: zone } = await supabase
      .from("zones")
      .select("id")
      .eq("id", changes.zone_id)
      .eq("store_id", campaign.store_id)
      .eq("is_active", true)
      .maybeSingle();
    if (!zone) return NextResponse.json({ error: "La zona no pertenece a esta tienda" }, { status: 400 });
  }

  const today = localDate(new Date(), storeTimeZone(auth.store));
  const isCancelled = cancelled ?? campaign.status === "cancelled";
  const status = isCancelled ? "cancelled" : campaignStatus({ ...merged, status: "planned" }, today);

  const { data: updated, error } = await supabase
    .from("campaigns")
    .update({ ...changes, status, results: null, updated_at: new Date().toISOString() })
    .eq("id", campaign.id)
    .select("*, zones(id, name, color)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: updated });
}

/** HU-17: dar de baja una campaña (baja lógica: queda en estado cancelled con su histórico). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const campaign = await loadCampaign(params.campaignId);
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });

  const auth = await authorizeStore(campaign.store_id, "manage_campaigns");
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", campaign.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
