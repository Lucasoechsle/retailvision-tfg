/**
 * Presentación de las alertas (HU-12 y HU-22): tipo, severidad, zona afectada y un
 * detalle legible. Lo usan la pantalla de alertas y la exportación a CSV, así que no
 * importa nada del servidor.
 */

export const ALERT_TYPE_LABELS: Record<string, string> = {
  queue_length: "Cola larga",
  occupancy: "Ocupación",
  zone_empty: "Zona vacía",
  device_offline: "Dispositivo offline",
  traffic_anomaly: "Anomalía de tráfico",
};

export const ALERT_STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  acknowledged: "Vista",
  resolved: "Resuelta",
};

export type AlertSeverity = "critical" | "high" | "medium";

export const SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
};

type Data = Record<string, any> | null | undefined;
type Config = Record<string, any> | null | undefined;

// Los umbrales se guardan con dos convenciones de nombres (reglas del dashboard y datos de demo)
const queueThreshold = (cfg: Config) => Number(cfg?.max_people ?? cfg?.threshold_people ?? 5);
const occupancyThreshold = (cfg: Config) => Number(cfg?.max_occupancy ?? cfg?.threshold_inside ?? 100);

/** Cola más larga de las que disparó la alerta (formato del motor: data.values.queues). */
function worstQueue(data: Data): Record<string, any> | null {
  const queues: any[] = data?.values?.queues || [];
  return queues.length
    ? queues.reduce((a, b) => ((Number(b.people_in_queue) || 0) > (Number(a.people_in_queue) || 0) ? b : a))
    : null;
}

function peopleInQueue(data: Data): number | null {
  if (typeof data?.people_in_queue === "number") return data.people_in_queue;
  const queue = worstQueue(data);
  return queue ? Number(queue.people_in_queue) || 0 : null;
}

function currentInside(data: Data): number | null {
  const value = data?.current_inside ?? data?.values?.current_inside;
  return typeof value === "number" ? value : null;
}

/**
 * Severidad según el tipo de regla y cuánto se superó el umbral: superar en más de un
 * 50 % el máximo de cola, o en más de un 10 % el aforo, es crítico.
 */
export function alertSeverity(ruleType: string, data: Data, config: Config): AlertSeverity {
  switch (ruleType) {
    case "queue_length": {
      const people = peopleInQueue(data);
      return people != null && people > queueThreshold(config ?? data?.rule_config) * 1.5 ? "critical" : "high";
    }
    case "occupancy": {
      const inside = currentInside(data);
      const max = Number(data?.threshold ?? occupancyThreshold(config ?? data?.rule_config));
      return inside != null && inside > max * 1.1 ? "critical" : "high";
    }
    case "device_offline":
      return "high";
    default:
      return "medium";
  }
}

/** Zona afectada (nombre), o "Toda la tienda" si la alerta no es de una zona puntual. */
export function alertZone(data: Data, config: Config, zoneNames: Record<string, string>): string {
  if (typeof data?.zone === "string") return data.zone;
  const zoneId = data?.zone_id ?? config?.zone_id ?? data?.rule_config?.zone_id;
  if (zoneId && zoneNames[zoneId]) return zoneNames[zoneId];
  return "Toda la tienda";
}

/** Tiempo sin conexión en la unidad más legible: minutos, horas o días. */
function formatOffline(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 48 * 60) return `${Math.floor(minutes / 60)} h`;
  return `${Math.floor(minutes / (24 * 60))} días`;
}

function formatWait(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins} min${secs ? ` ${secs} s` : ""}` : `${secs} s`;
}

/** Descripción legible de lo que disparó la alerta. */
export function alertDetail(ruleType: string, data: Data, config: Config): string {
  switch (ruleType) {
    case "queue_length": {
      const people = peopleInQueue(data);
      const wait = data?.estimated_wait_seconds ?? worstQueue(data)?.estimated_wait_seconds;
      const parts = [
        people != null ? `${people} personas en cola` : "Cola sobre el umbral",
        `máximo ${queueThreshold(config ?? data?.rule_config)}`,
      ];
      if (typeof wait === "number") parts.push(`espera estimada ${formatWait(wait)}`);
      return parts.join(" · ");
    }
    case "occupancy": {
      const inside = currentInside(data);
      const max = data?.threshold ?? occupancyThreshold(config ?? data?.rule_config);
      return `${inside ?? "?"} personas dentro · aforo máximo ${max}`;
    }
    case "device_offline":
      return data?.device
        ? `${data.device} sin conexión${data.last_seen_minutes ? ` hace ${formatOffline(data.last_seen_minutes)}` : ""}`
        : "Dispositivo sin conexión";
    case "zone_empty":
      return "Zona sin movimiento en el período";
    case "traffic_anomaly": {
      const entries = data?.values?.entries;
      return typeof entries === "number"
        ? `${entries} entradas en el período, fuera del rango esperado`
        : "Tráfico fuera del rango esperado";
    }
    default:
      return "";
  }
}
