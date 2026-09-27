import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/auth/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: campaign, error: campError } = await supabase
    .from("campaigns")
    .select("*, zones(id, name, color, zone_type)")
    .eq("id", params.campaignId)
    .single();

  if (campError || !campaign) {
    return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
  }

  const { data: metrics } = await supabase.rpc("get_campaign_metrics", {
    p_campaign_id: params.campaignId,
  });

  const baseline = (metrics || []).find((m: any) => m.period === "baseline") || null;
  const campaignData = (metrics || []).find((m: any) => m.period === "campaign") || null;

  let changes: Record<string, number | null> = {};
  if (baseline && campaignData) {
    const pctChange = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : null;

    changes = {
      visitors: pctChange(campaignData.avg_daily_visitors, baseline.avg_daily_visitors),
      zone_visits: pctChange(campaignData.total_zone_visits, baseline.total_zone_visits),
      dwell_time: pctChange(campaignData.avg_dwell_seconds, baseline.avg_dwell_seconds),
      engagement: pctChange(campaignData.avg_engagement_rate, baseline.avg_engagement_rate),
      transactions: pctChange(campaignData.total_transactions, baseline.total_transactions),
      conversion: pctChange(campaignData.conversion_rate, baseline.conversion_rate),
    };
  }

  const { data: dailyData } = await supabase
    .from("daily_store_summaries")
    .select("date, total_visitors, total_transactions, conversion_rate")
    .eq("store_id", campaign.store_id)
    .gte("date", campaign.baseline_start)
    .lte("date", campaign.end_date)
    .order("date");

  return NextResponse.json({
    campaign,
    baseline,
    campaign_metrics: campaignData,
    changes,
    daily_data: dailyData || [],
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const auth = await authorize("manage_campaigns");
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", params.campaignId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
