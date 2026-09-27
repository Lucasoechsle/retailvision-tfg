import { SupabaseClient } from "@supabase/supabase-js";

interface AlertRule {
  id: string;
  store_id: string;
  name: string;
  rule_type: string;
  config: Record<string, any>;
  is_active: boolean;
}

interface AlertContext {
  store_id: string;
  type: "counts" | "zones" | "queues" | "heartbeat";
  data: Record<string, any>;
}

export async function evaluateAlerts(
  supabase: SupabaseClient,
  context: AlertContext
) {
  const { data: rules } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("store_id", context.store_id)
    .eq("is_active", true);

  if (!rules || rules.length === 0) return;

  for (const rule of rules) {
    const shouldFire = await checkRule(rule, context);
    if (shouldFire) {
      const recentDuplicate = await hasRecentAlert(supabase, rule.id, 15);
      if (!recentDuplicate) {
        await supabase.from("alert_events").insert({
          rule_id: rule.id,
          store_id: context.store_id,
          data: {
            trigger: context.type,
            values: context.data,
            rule_config: rule.config,
            zone_id: affectedZoneId(rule, context),
          },
          status: "active",
        });
      }
    }
  }
}

/** Zona afectada por la alerta, para mostrarla en el panel (HU-12); null = toda la tienda. */
function affectedZoneId(rule: AlertRule, context: AlertContext): string | null {
  if (rule.rule_type === "zone_empty") return rule.config.zone_id ?? null;
  if (rule.rule_type === "queue_length") {
    const threshold = rule.config.max_people || 5;
    const worst = (context.data.queues || [])
      .filter((q: any) => q.people_in_queue > threshold)
      .sort((a: any, b: any) => b.people_in_queue - a.people_in_queue)[0];
    return worst?.zone_id ?? null;
  }
  return null;
}

async function hasRecentAlert(
  supabase: SupabaseClient,
  ruleId: string,
  minutesWindow: number
): Promise<boolean> {
  const since = new Date(Date.now() - minutesWindow * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("alert_events")
    .select("id")
    .eq("rule_id", ruleId)
    .gte("triggered_at", since)
    .limit(1);

  return (data?.length || 0) > 0;
}

async function checkRule(rule: AlertRule, context: AlertContext): Promise<boolean> {
  const config = rule.config;

  switch (rule.rule_type) {
    case "queue_length": {
      if (context.type !== "queues") return false;
      const threshold = config.max_people || 5;
      const queues = context.data.queues || [];
      return queues.some((q: any) => q.people_in_queue > threshold);
    }

    case "occupancy": {
      if (context.type !== "counts") return false;
      const maxOccupancy = config.max_occupancy || 100;
      return (context.data.current_inside || 0) > maxOccupancy;
    }

    case "zone_empty": {
      if (context.type !== "zones") return false;
      const targetZone = config.zone_id;
      const minMinutes = config.empty_minutes || 30;
      if (!targetZone) return false;
      const zones = context.data.zones || [];
      const zone = zones.find((z: any) => z.zone_id === targetZone);
      return zone && zone.entries === 0 && zone.exits === 0;
    }

    case "device_offline": {
      if (context.type !== "heartbeat") return false;
      return false;
    }

    case "traffic_anomaly": {
      if (context.type !== "counts") return false;
      const minEntries = config.min_entries_expected || 0;
      const maxEntries = config.max_entries_expected || 999999;
      const entries = context.data.entries || 0;
      return entries < minEntries || entries > maxEntries;
    }

    default:
      return false;
  }
}
