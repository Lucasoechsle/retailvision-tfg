"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Pencil, Ban, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPES,
  LIFT_METRICS,
  PERIOD_LABELS,
  type Campaign,
  type CampaignRoi,
  type LiftKey,
  type PeriodKey,
  type PeriodMetrics,
} from "@/lib/campaigns";

interface AnalysisData {
  campaign: Campaign;
  today: string;
  periods: Record<PeriodKey, PeriodMetrics>;
  lift: { campaign: Record<LiftKey, number | null>; post: Record<LiftKey, number | null> };
  roi: CampaignRoi | null;
  daily: { date: string; period: PeriodKey; visitors: number; transactions: number; revenue: number }[];
}

interface CampaignAnalysisProps {
  campaignId: string;
  /** Cambia cuando la campaña se edita, para volver a calcular. */
  refreshKey: number;
  canManage: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onReactivate: () => void;
}

const PERIODS: PeriodKey[] = ["baseline", "campaign", "post"];

export const PERIOD_COLORS: Record<PeriodKey, string> = {
  baseline: "hsl(var(--muted-foreground))",
  campaign: "hsl(var(--primary))",
  post: "hsl(38 92% 50%)",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  planned: "secondary",
  active: "default",
  completed: "outline",
  cancelled: "destructive",
};

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
const range = (from: string, to: string) => (from === to ? shortDate(from) : `${shortDate(from)} al ${shortDate(to)}`);
const number = (value: number, digits = 0) =>
  value.toLocaleString("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const money = (value: number) => `${value < 0 ? "−" : ""}$${number(Math.abs(value))}`;

function formatDwell(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins} min ${secs} s` : `${mins} min`;
}

function formatMetric(key: LiftKey, value: number | null): string {
  if (value == null) return "—";
  switch (key) {
    case "avg_dwell_seconds":
      return formatDwell(value);
    case "engagement_rate":
    case "conversion_rate":
      return `${number(value, 1)} %`;
    case "revenue_per_day":
      return money(value);
    default:
      return number(value);
  }
}

function LiftChip({ value }: { value: number | null }) {
  if (value == null) return null;
  const rounded = Math.round(value * 10) / 10;
  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        rounded > 0 && "text-emerald-500",
        rounded < 0 && "text-red-500",
        rounded === 0 && "text-muted-foreground"
      )}
    >
      {rounded > 0 ? "+" : ""}
      {number(rounded, 1)} %
    </span>
  );
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

/** Barras de una métrica en los tres períodos. */
function PeriodChart({
  title,
  data,
  format,
}: {
  title: string;
  data: { key: PeriodKey; value: number | null }[];
  format: (v: number) => string;
}) {
  const rows = data.map((d) => ({ name: PERIOD_LABELS[d.key], key: d.key, value: d.value ?? 0, missing: d.value == null }));
  if (rows.every((r) => r.missing)) {
    return (
      <div className="rounded-lg border p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
        <p className="flex h-[140px] items-center justify-center px-2 text-center text-xs text-muted-foreground">
          Sin datos en estos períodos
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="name" interval={0} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={44} />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            formatter={(value, _name, item: any) => [item?.payload?.missing ? "sin datos" : format(Number(value)), title]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {rows.map((r) => (
              <Cell key={r.key} fill={PERIOD_COLORS[r.key]} fillOpacity={r.key === "baseline" ? 0.5 : 0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * HU-18: efectividad de la campaña. Compara los períodos previo, activo y posterior,
 * muestra el lift respecto del previo y el ROI estimado con las transacciones POS.
 */
export function CampaignAnalysis({
  campaignId,
  refreshKey,
  canManage,
  onEdit,
  onCancel,
  onReactivate,
}: CampaignAnalysisProps) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/campaigns/${campaignId}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "No se pudo calcular la efectividad");
        return body;
      })
      .then((body) => !cancelled && setData(body))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [campaignId, refreshKey]);

  // Al cambiar de campaña no se muestran los datos de la anterior mientras carga
  const stale = !data || data.campaign.id !== campaignId;
  if (loading && stale) return <p className="py-12 text-center text-sm text-muted-foreground">Calculando…</p>;
  if (error) return <p className="py-12 text-center text-sm text-destructive">{error}</p>;
  if (!data) return null;

  const { campaign, periods, lift, roi, daily } = data;
  const post = periods.post;

  const note =
    campaign.status === "cancelled"
      ? "La campaña está dada de baja. Sus métricas se conservan."
      : campaign.status === "planned"
        ? `La campaña empieza el ${shortDate(campaign.start_date)}. Por ahora solo hay datos del período previo.`
        : campaign.status === "active"
          ? `La campaña está en curso: el período activo tiene datos hasta hoy y el posterior empieza el ${shortDate(post.from)}.`
          : post.state === "in_progress"
            ? `El período posterior sigue en curso (hasta el ${shortDate(post.to)}).`
            : null;

  const dailyData = daily.map((d) => ({
    ...d,
    label: shortDate(d.date),
    periodLabel: PERIOD_LABELS[d.period],
  }));

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{campaign.name}</h3>
            <Badge variant={STATUS_VARIANTS[campaign.status]}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {CAMPAIGN_TYPES[campaign.campaign_type as keyof typeof CAMPAIGN_TYPES] ?? campaign.campaign_type}
            {" · "}
            {campaign.zones?.name ?? "Toda la tienda"}
            {campaign.product_category && ` · ${campaign.product_category}`}
            {" · "}
            {campaign.promo_cost != null
              ? `costo de exhibición ${money(Number(campaign.promo_cost))}`
              : "sin costo de exhibición cargado"}
          </p>
          {campaign.description && <p className="text-sm">{campaign.description}</p>}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
            {campaign.status === "cancelled" ? (
              <Button variant="outline" size="sm" onClick={onReactivate}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reactivar
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={onCancel}>
                <Ban className="mr-1.5 h-3.5 w-3.5" />
                Dar de baja
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Períodos */}
      <div className="grid grid-cols-3 gap-2">
        {PERIODS.map((key) => (
          <div key={key} className="rounded-lg border p-2.5">
            <p className="flex items-center gap-1.5 text-xs font-medium">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PERIOD_COLORS[key] }} />
              {PERIOD_LABELS[key]}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {range(periods[key].from, periods[key].to)}
            </p>
          </div>
        ))}
      </div>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}

      {/* Comparativa y lift */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2 font-medium">Métrica</th>
              {PERIODS.map((key) => (
                <th key={key} className="px-3 py-2 text-right font-medium">
                  {PERIOD_LABELS[key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIFT_METRICS.map((m) => (
              <tr key={m.key} className="border-b last:border-0">
                <td className="px-3 py-2 text-muted-foreground">{m.label}</td>
                {PERIODS.map((key) => {
                  const p = periods[key];
                  const value = p.state === "future" || p.days_with_data === 0 ? null : p[m.key];
                  return (
                    <td key={key} className="px-3 py-2 text-right tabular-nums">
                      <div>{formatMetric(m.key, value)}</div>
                      {key !== "baseline" && value != null && <LiftChip value={lift[key][m.key]} />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">
        El porcentaje debajo de cada valor es el lift respecto del período previo.
      </p>

      {/* Gráficos comparativos */}
      <div className="grid gap-3 sm:grid-cols-3">
        <PeriodChart
          title="Tráfico (visitantes por día)"
          format={(v) => number(v)}
          data={PERIODS.map((key) => ({
            key,
            value: periods[key].days_with_data ? periods[key].visitors_per_day : null,
          }))}
        />
        <PeriodChart
          title="Dwell time en la zona"
          format={formatDwell}
          data={PERIODS.map((key) => ({ key, value: periods[key].avg_dwell_seconds }))}
        />
        <PeriodChart
          title="Engagement en la zona (%)"
          format={(v) => `${number(v, 1)} %`}
          data={PERIODS.map((key) => ({ key, value: periods[key].engagement_rate }))}
        />
      </div>

      {dailyData.length > 0 && (
        <div className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Visitantes por día</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={44} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                labelFormatter={(label, payload) =>
                  payload?.[0]?.payload ? `${label} · ${payload[0].payload.periodLabel}` : label
                }
                formatter={(value) => [number(Number(value ?? 0)), "Visitantes"]}
              />
              <Bar dataKey="visitors" radius={[3, 3, 0, 0]}>
                {dailyData.map((d) => (
                  <Cell key={d.date} fill={PERIOD_COLORS[d.period]} fillOpacity={d.period === "baseline" ? 0.5 : 0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ROI */}
      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">ROI estimado</p>
        {roi ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Ventas incrementales</p>
                <p className="text-lg font-semibold tabular-nums">{money(roi.incremental_revenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo de exhibición</p>
                <p className="text-lg font-semibold tabular-nums">
                  {roi.promo_cost != null ? money(roi.promo_cost) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ROI</p>
                <p
                  className={cn(
                    "text-lg font-semibold tabular-nums",
                    roi.roi != null && roi.roi >= 0 && "text-emerald-500",
                    roi.roi != null && roi.roi < 0 && "text-red-500"
                  )}
                >
                  {roi.roi != null ? `${roi.roi > 0 ? "+" : ""}${number(roi.roi, 1)} %` : "—"}
                </p>
              </div>
            </div>
            {roi.promo_cost == null && (
              <p className="mt-2 text-sm text-muted-foreground">
                Cargá el costo de exhibición para calcular el ROI.{" "}
                {canManage && (
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={onEdit}>
                    Editar la campaña
                  </Button>
                )}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Ventas incrementales = (ventas por día durante la campaña − ventas por día del período previo) ×
              días de campaña con datos. ROI = (ventas incrementales − costo de exhibición) ÷ costo de exhibición.
              Se toman las transacciones POS de toda la tienda y no se descuenta el costo de la mercadería.
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            No hay transacciones POS en el período previo y en el activo, así que todavía no se puede estimar.
          </p>
        )}
      </div>
    </div>
  );
}
