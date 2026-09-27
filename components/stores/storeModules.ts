import {
  Activity,
  BarChart3,
  CalendarClock,
  LayoutGrid,
  Map,
  Megaphone,
  Route,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { StoreModule } from "@/lib/auth/roles";

export interface StoreModuleLink {
  module: StoreModule;
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

/** Módulos analíticos de una sucursal, en el orden en que se muestran. */
export const STORE_MODULE_LINKS: StoreModuleLink[] = [
  { module: "traffic", href: "traffic", icon: BarChart3, title: "Tráfico", desc: "Entradas y salidas" },
  { module: "zones", href: "zones", icon: Map, title: "Zonas", desc: "Tráfico y permanencia por zona" },
  { module: "heatmap", href: "heatmap", icon: Activity, title: "Mapa de Calor", desc: "Patrones de tráfico" },
  { module: "conversion", href: "conversion", icon: Users, title: "Conversión", desc: "Visitantes vs ventas" },
  { module: "journeys", href: "journeys", icon: Route, title: "Recorridos", desc: "Trayectoria del cliente" },
  { module: "queues", href: "queues", icon: ShoppingCart, title: "Colas", desc: "Tiempos de espera" },
  { module: "promos", href: "promos", icon: Megaphone, title: "Promociones", desc: "Efectividad de campañas" },
  { module: "shelves", href: "shelves", icon: LayoutGrid, title: "Góndolas", desc: "Heatmap por estante" },
  { module: "temporal", href: "temporal", icon: CalendarClock, title: "Temporal", desc: "Tendencias y patrones" },
];
