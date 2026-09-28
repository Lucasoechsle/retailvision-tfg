/** Campañas promocionales (HU-17) y su efectividad antes, durante y después (HU-18). */

import { addDays, daysInclusive } from "@/lib/dates";

export const CAMPAIGN_TYPES = {
  promo: "Promoción",
  endcap: "Cabecera",
  island: "Isla",
  seasonal: "Estacional",
  layout_change: "Cambio de layout",
  other: "Otro",
} as const;

export type CampaignType = keyof typeof CAMPAIGN_TYPES;

export const CAMPAIGN_STATUS_LABELS = {
  planned: "Planificada",
  active: "Activa",
  completed: "Finalizada",
  cancelled: "Dada de baja",
} as const;

export type CampaignStatus = keyof typeof CAMPAIGN_STATUS_LABELS;

export interface Campaign {
  id: string;
  store_id: string;
  zone_id: string | null;
  name: string;
  description: string | null;
  campaign_type: string;
  start_date: string;
  end_date: string;
  baseline_start: string;
  baseline_end: string;
  product_category: string | null;
  promo_cost: number | null;
  status: CampaignStatus;
  results?: Record<string, any> | null;
  zones?: { id?: string; name: string; color: string } | null;
}

/** Estado según las fechas y el día de hoy de la tienda; una campaña dada de baja queda así. */
export function campaignStatus(
  campaign: { start_date: string; end_date: string; status: string },
  today: string
): CampaignStatus {
  if (campaign.status === "cancelled") return "cancelled";
  if (today < campaign.start_date) return "planned";
  if (today > campaign.end_date) return "completed";
  return "active";
}

/** Período posterior: tantos días como duró la campaña, desde el día siguiente al fin. */
export function postPeriod(campaign: { start_date: string; end_date: string }) {
  const length = daysInclusive(campaign.start_date, campaign.end_date);
  return { from: addDays(campaign.end_date, 1), to: addDays(campaign.end_date, length) };
}

export type PeriodKey = "baseline" | "campaign" | "post";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  baseline: "Previo",
  campaign: "Activo",
  post: "Posterior",
};

interface StoreDay {
  date: string;
  total_visitors: number | null;
  total_transactions: number | null;
  total_revenue: number | null;
}

interface ZoneDay {
  date: string;
  total_visits: number | null;
  avg_dwell_seconds: number | null;
  engagement_rate: number | null;
}

export interface PeriodMetrics {
  key: PeriodKey;
  label: string;
  from: string;
  to: string;
  /** complete: ya terminó · in_progress: incluye hoy · future: todavía no empezó. */
  state: "complete" | "in_progress" | "future";
  /** Días del período con datos registrados; los promedios diarios se calculan sobre ellos. */
  days_with_data: number;
  visitors: number;
  visitors_per_day: number | null;
  zone_visits: number;
  zone_visits_per_day: number | null;
  avg_dwell_seconds: number | null;
  engagement_rate: number | null;
  transactions: number;
  transactions_per_day: number | null;
  revenue: number;
  revenue_per_day: number | null;
  conversion_rate: number | null;
}

/** Promedio de un valor diario ponderado por las visitas del día (o simple si no hay visitas). */
function weightedAverage(rows: ZoneDay[], pick: (r: ZoneDay) => number | null): number | null {
  const valid = rows.filter((r) => pick(r) != null);
  if (valid.length === 0) return null;
  const weight = valid.reduce((s, r) => s + (r.total_visits || 0), 0);
  if (weight > 0) return valid.reduce((s, r) => s + pick(r)! * (r.total_visits || 0), 0) / weight;
  return valid.reduce((s, r) => s + pick(r)!, 0) / valid.length;
}

/** Métricas de un período a partir de los resúmenes diarios de la tienda y de la zona. */
export function periodMetrics(
  key: PeriodKey,
  from: string,
  to: string,
  today: string,
  storeDays: StoreDay[],
  zoneDays: ZoneDay[]
): PeriodMetrics {
  const store = storeDays.filter((d) => d.date >= from && d.date <= to);
  const zone = zoneDays.filter((d) => d.date >= from && d.date <= to);
  const days = store.length;
  const perDay = (total: number) => (days > 0 ? total / days : null);

  const visitors = store.reduce((s, d) => s + (d.total_visitors || 0), 0);
  const transactions = store.reduce((s, d) => s + (d.total_transactions || 0), 0);
  const revenue = store.reduce((s, d) => s + Number(d.total_revenue || 0), 0);
  const zoneVisits = zone.reduce((s, d) => s + (d.total_visits || 0), 0);
  const zoneDaysCount = new Set(zone.map((d) => d.date)).size;

  return {
    key,
    label: PERIOD_LABELS[key],
    from,
    to,
    state: today < from ? "future" : today <= to ? "in_progress" : "complete",
    days_with_data: days,
    visitors,
    visitors_per_day: perDay(visitors),
    zone_visits: zoneVisits,
    zone_visits_per_day: zoneDaysCount > 0 ? zoneVisits / zoneDaysCount : null,
    avg_dwell_seconds: weightedAverage(zone, (r) => r.avg_dwell_seconds),
    engagement_rate: weightedAverage(zone, (r) => r.engagement_rate),
    transactions,
    transactions_per_day: perDay(transactions),
    revenue,
    revenue_per_day: perDay(revenue),
    conversion_rate: visitors > 0 ? (transactions / visitors) * 100 : null,
  };
}

/** Variación porcentual respecto del período previo (lift); null si no hay base. */
export function lift(value: number | null, baseline: number | null): number | null {
  if (value == null || baseline == null || baseline === 0) return null;
  return ((value - baseline) / baseline) * 100;
}

export const LIFT_METRICS = [
  { key: "visitors_per_day", label: "Visitantes por día" },
  { key: "zone_visits_per_day", label: "Visitas a la zona por día" },
  { key: "avg_dwell_seconds", label: "Dwell time en la zona" },
  { key: "engagement_rate", label: "Engagement en la zona" },
  { key: "transactions_per_day", label: "Transacciones por día" },
  { key: "revenue_per_day", label: "Ventas por día" },
  { key: "conversion_rate", label: "Conversión" },
] as const;

export type LiftKey = (typeof LIFT_METRICS)[number]["key"];

export function liftAgainst(period: PeriodMetrics, baseline: PeriodMetrics): Record<LiftKey, number | null> {
  return Object.fromEntries(
    LIFT_METRICS.map((m) => [m.key, lift(period[m.key], baseline[m.key])])
  ) as Record<LiftKey, number | null>;
}

export interface CampaignRoi {
  /** Ventas adicionales atribuibles: diferencia de ventas diarias contra el previo, por los días de campaña. */
  incremental_revenue: number;
  promo_cost: number | null;
  /** (ventas incrementales − costo) / costo, en %; null si no hay costo cargado. */
  roi: number | null;
}

/**
 * ROI estimado de la campaña (HU-18): se calcula cuando hay transacciones POS en el
 * período activo y en el previo.
 */
export function campaignRoi(
  baseline: PeriodMetrics,
  campaign: PeriodMetrics,
  promoCost: number | null
): CampaignRoi | null {
  if (campaign.transactions === 0 || baseline.transactions === 0) return null;
  if (campaign.revenue_per_day == null || baseline.revenue_per_day == null) return null;
  const incremental = (campaign.revenue_per_day - baseline.revenue_per_day) * campaign.days_with_data;
  const cost = promoCost != null && promoCost > 0 ? promoCost : null;
  return {
    incremental_revenue: incremental,
    promo_cost: cost,
    roi: cost ? ((incremental - cost) / cost) * 100 : null,
  };
}
