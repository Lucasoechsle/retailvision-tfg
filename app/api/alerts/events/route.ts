import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/auth/api";
import { canAccessSection } from "@/lib/auth/roles";
import { canAccessStore, getAccessibleStores } from "@/lib/auth/session";
import { dayRange, isIsoDate, localDate, storeTimeZone } from "@/lib/dates";
import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  SEVERITY_LABELS,
  alertDetail,
  alertSeverity,
  alertZone,
} from "@/lib/alerts/present";

const STATUSES = ["active", "acknowledged", "resolved"];

/**
 * HU-22: historial de alertas filtrable por tienda, rango de fechas, tipo y estado.
 * ?storeId=&status=all|active|acknowledged|resolved&type=all|<rule_type>&from=AAAA-MM-DD&to=AAAA-MM-DD
 * Con ?format=csv devuelve el listado completo como archivo CSV.
 */
export async function GET(request: NextRequest) {
  const auth = await authorize();
  if (auth.error) return auth.error;
  if (!canAccessSection(auth.session.role, "alerts")) {
    return NextResponse.json({ error: "Tu perfil no tiene acceso a las alertas" }, { status: 403 });
  }

  const params = request.nextUrl.searchParams;
  const storeId = params.get("storeId");
  const status = params.get("status") || "all";
  const type = params.get("type") || "all";
  const fromDate = params.get("from");
  const toDate = params.get("to");
  const asCsv = params.get("format") === "csv";

  // Tiendas visibles para la sesión (el gerente de tienda solo ve las suyas)
  const stores = await getAccessibleStores(auth.session);
  const selected = storeId ? stores.filter((s) => s.id === storeId) : stores;
  if (storeId && (selected.length === 0 || !canAccessStore(auth.session, selected[0]))) {
    return NextResponse.json({ error: "No tenés acceso a esta tienda" }, { status: 403 });
  }
  if (selected.length === 0) return NextResponse.json({ events: [], counts: {} });

  const storeIds = selected.map((s) => s.id);
  const timeZone = storeTimeZone(selected[0]);
  const range =
    isIsoDate(fromDate) || isIsoDate(toDate)
      ? dayRange(
          isIsoDate(fromDate) ? fromDate : "2000-01-01",
          isIsoDate(toDate) ? toDate : localDate(new Date(), timeZone),
          timeZone
        )
      : null;

  const supabase = createClient();
  const rulesJoin = type !== "all" ? "alert_rules!inner(name, rule_type, config)" : "alert_rules(name, rule_type, config)";

  let query = supabase
    .from("alert_events")
    .select(`id, store_id, triggered_at, resolved_at, status, data, ${rulesJoin}`)
    .in("store_id", storeIds)
    .order("triggered_at", { ascending: false })
    .limit(asCsv ? 5000 : 200);

  if (STATUSES.includes(status)) query = query.eq("status", status);
  if (type !== "all") query = query.eq("alert_rules.rule_type", type);
  if (range) {
    query = query.gte("triggered_at", range.from.toISOString()).lt("triggered_at", range.to.toISOString());
  }

  const [eventsRes, zonesRes] = await Promise.all([
    query,
    supabase.from("zones").select("id, name").in("store_id", storeIds),
  ]);
  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 });

  const zoneNames = Object.fromEntries((zonesRes.data || []).map((z) => [z.id, z.name]));
  const storeNames = Object.fromEntries(selected.map((s) => [s.id, s.name]));

  const events = (eventsRes.data || []).map((e: any) => {
    const rule = e.alert_rules;
    const ruleType = rule?.rule_type || "traffic_anomaly";
    const severity = alertSeverity(ruleType, e.data, rule?.config);
    return {
      id: e.id,
      store_id: e.store_id,
      store_name: storeNames[e.store_id],
      triggered_at: e.triggered_at,
      resolved_at: e.resolved_at,
      status: e.status,
      rule_name: rule?.name || "Alerta",
      rule_type: ruleType,
      severity,
      zone: alertZone(e.data, rule?.config, zoneNames),
      detail: alertDetail(ruleType, e.data, rule?.config),
    };
  });

  if (asCsv) return csvResponse(events, timeZone, selected.length === 1 ? selected[0].name : "todas");

  // Totales por estado del período (independientes del filtro de estado)
  const counts: Record<string, number> = {};
  await Promise.all(
    STATUSES.map(async (s) => {
      let countQuery = supabase
        .from("alert_events")
        .select("id", { count: "exact", head: true })
        .in("store_id", storeIds)
        .eq("status", s);
      if (range) {
        countQuery = countQuery
          .gte("triggered_at", range.from.toISOString())
          .lt("triggered_at", range.to.toISOString());
      }
      counts[s] = (await countQuery).count || 0;
    })
  );

  return NextResponse.json({ events, counts });
}

type AlertRow = {
  triggered_at: string;
  resolved_at: string | null;
  store_name: string;
  rule_name: string;
  rule_type: string;
  severity: keyof typeof SEVERITY_LABELS;
  zone: string;
  status: string;
  detail: string;
};

/** CSV separado por ";" y con BOM, para que Excel en español lo abra con columnas y acentos correctos. */
function csvResponse(events: AlertRow[], timeZone: string, storeLabel: string) {
  const format = new Intl.DateTimeFormat("es-AR", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ["Fecha y hora", "Tienda", "Regla", "Tipo", "Severidad", "Zona", "Estado", "Detalle", "Resuelta"];
  const rows = events.map((e) => [
    format.format(new Date(e.triggered_at)),
    e.store_name,
    e.rule_name,
    ALERT_TYPE_LABELS[e.rule_type] || e.rule_type,
    SEVERITY_LABELS[e.severity],
    e.zone,
    ALERT_STATUS_LABELS[e.status] || e.status,
    e.detail,
    e.resolved_at ? format.format(new Date(e.resolved_at)) : "",
  ]);
  const csv = [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");

  const slug = storeLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
  const today = localDate(new Date(), timeZone);
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alertas_${slug}_${today}.csv"`,
    },
  });
}
