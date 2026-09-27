/**
 * Perfiles de usuario y permisos de RetailVision.
 *
 * Implementa los cuatro perfiles definidos en el apartado "Seguridad > Acceso a la
 * aplicación" del TFG. Es la única fuente de verdad sobre qué ve y qué puede hacer
 * cada rol: la usan el menú lateral, las guardas de las páginas y las rutas de API.
 * No importa nada del servidor, así que también puede usarse en componentes cliente.
 */

export const ROLES = [
  "owner",
  "store_manager",
  "category_manager",
  "commercial_director",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Administrador",
  store_manager: "Gerente de tienda",
  category_manager: "Gerente de categoría",
  commercial_director: "Director comercial",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Gestiona tiendas, dispositivos, zonas, reglas de alertas y usuarios.",
  store_manager:
    "Ocupación en tiempo real, tráfico, colas, alertas y predicción de tráfico de sus tiendas.",
  category_manager:
    "Mapas de calor, análisis por zona, recorridos, campañas promocionales y tasa de conversión.",
  commercial_director: "Vistas consolidadas, indicadores estratégicos e insights prescriptivos.",
};

/** Secciones del menú principal (nivel organización). */
export type Section =
  | "overview"
  | "stores"
  | "devices"
  | "analytics"
  | "benchmark"
  | "alerts"
  | "settings";

/** Módulos dentro de una sucursal (/stores/[storeId]/...). */
export type StoreModule =
  | "summary"
  | "traffic"
  | "queues"
  | "heatmap"
  | "zones"
  | "journeys"
  | "promos"
  | "conversion"
  | "shelves"
  | "temporal"
  | "devices"
  | "settings";

/** Acciones que modifican datos. */
export type Action =
  | "manage_stores" // HU-04
  | "manage_devices" // HU-05, HU-06, HU-07
  | "manage_zones" // HU-08
  | "manage_alert_rules" // HU-21
  | "manage_users"
  | "update_alerts" // HU-12: marcar alertas como leídas o resueltas
  | "manage_campaigns" // HU-17
  | "load_transactions"; // HU-19

const SECTIONS: Record<Role, readonly Section[]> = {
  owner: ["overview", "stores", "devices", "analytics", "benchmark", "alerts", "settings"],
  store_manager: ["overview", "stores", "analytics", "alerts", "settings"],
  category_manager: ["overview", "stores", "settings"],
  commercial_director: ["overview", "stores", "analytics", "benchmark", "settings"],
};

const STORE_MODULES: Record<Role, readonly StoreModule[]> = {
  owner: [
    "summary",
    "traffic",
    "queues",
    "heatmap",
    "zones",
    "journeys",
    "promos",
    "conversion",
    "shelves",
    "temporal",
    "devices",
    "settings",
  ],
  store_manager: ["summary", "traffic", "queues", "temporal"],
  category_manager: ["summary", "heatmap", "zones", "journeys", "promos", "conversion", "shelves"],
  commercial_director: ["summary", "temporal"],
};

const ACTIONS: Record<Role, readonly Action[]> = {
  owner: [
    "manage_stores",
    "manage_devices",
    "manage_zones",
    "manage_alert_rules",
    "manage_users",
    "update_alerts",
    "manage_campaigns",
    "load_transactions",
  ],
  store_manager: ["update_alerts"],
  category_manager: ["manage_campaigns", "load_transactions"],
  commercial_director: [],
};

/** Valores de rol usados antes de la migración a los cuatro perfiles del TFG. */
const LEGACY_ROLES: Record<string, Role> = {
  admin: "owner",
  manager: "store_manager",
  analyst: "category_manager",
  viewer: "commercial_director",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Convierte el valor guardado en la base al perfil correspondiente (con el menor privilegio si es desconocido). */
export function normalizeRole(value: unknown): Role {
  if (isRole(value)) return value;
  if (typeof value === "string" && Object.prototype.hasOwnProperty.call(LEGACY_ROLES, value)) {
    return LEGACY_ROLES[value];
  }
  return "commercial_director";
}

export function canAccessSection(role: Role, section: Section): boolean {
  return SECTIONS[role].includes(section);
}

export function canAccessStoreModule(role: Role, module: StoreModule): boolean {
  return STORE_MODULES[role].includes(module);
}

export function can(role: Role, action: Action): boolean {
  return ACTIONS[role].includes(action);
}

/** Solo el gerente de tienda puede quedar limitado a las sucursales a su cargo. */
export function isStoreScoped(role: Role): boolean {
  return role === "store_manager";
}
