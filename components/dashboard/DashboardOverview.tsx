"use client";

import { MetricCard } from "./MetricCard";
import {
  Activity,
  Bell,
  Megaphone,
  Store as StoreIcon,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  can,
  canAccessStoreModule,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type Role,
} from "@/lib/auth/roles";
import { STORE_MODULE_LINKS } from "@/components/stores/storeModules";
import type { Store } from "@/types";

interface OverviewMetrics {
  devicesOnline: number;
  devicesTotal: number;
  totalVisitorsToday: number;
  conversionRate: number | null;
  currentInside: number;
  activeAlerts: number;
  activeCampaigns: number;
}

interface DashboardOverviewProps {
  role: Role;
  stores: Store[];
  metrics: OverviewMetrics;
}

type MetricKey = "stores" | "devices" | "visitors" | "conversion" | "occupancy" | "alerts" | "campaigns";

/** Indicadores que ve cada perfil en su panel de inicio. */
const METRICS_BY_ROLE: Record<Role, MetricKey[]> = {
  owner: ["stores", "devices", "visitors", "conversion"],
  store_manager: ["stores", "occupancy", "visitors", "alerts"],
  category_manager: ["stores", "visitors", "conversion", "campaigns"],
  commercial_director: ["stores", "visitors", "conversion", "occupancy"],
};

export function DashboardOverview({ role, stores, metrics }: DashboardOverviewProps) {
  const canManageStores = can(role, "manage_stores");
  const modules = STORE_MODULE_LINKS.filter((m) => canAccessStoreModule(role, m.module));

  const cards: Record<
    MetricKey,
    { title: string; value: string | number; icon: LucideIcon; description?: string; change?: string }
  > = {
    stores: {
      title: role === "store_manager" ? "Tiendas a Cargo" : "Tiendas Activas",
      value: stores.length,
      icon: StoreIcon,
    },
    devices: {
      title: "Dispositivos Online",
      value: metrics.devicesOnline,
      icon: Activity,
      change: metrics.devicesTotal > 0 ? `de ${metrics.devicesTotal}` : undefined,
    },
    visitors: {
      title: "Visitantes Hoy",
      value: metrics.totalVisitorsToday > 0 ? metrics.totalVisitorsToday.toLocaleString("es") : "--",
      icon: Users,
      description: metrics.totalVisitorsToday > 0 ? "todas las tiendas" : "conecta dispositivos",
    },
    conversion: {
      title: "Tasa de Conversión",
      value: metrics.conversionRate !== null ? `${metrics.conversionRate}%` : "--",
      icon: TrendingUp,
      description: metrics.conversionRate !== null ? "visitantes que compran" : "conecta POS",
    },
    occupancy: {
      title: "En Tienda Ahora",
      value: metrics.currentInside,
      icon: Activity,
      change: metrics.currentInside > 0 ? "live" : undefined,
    },
    alerts: {
      title: "Alertas Activas",
      value: metrics.activeAlerts,
      icon: Bell,
      description: "sin resolver",
    },
    campaigns: {
      title: "Campañas Activas",
      value: metrics.activeCampaigns,
      icon: Megaphone,
      description: "en curso",
    },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-muted-foreground">
          Panel de {ROLE_LABELS[role]} · {ROLE_DESCRIPTIONS[role]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS_BY_ROLE[role].map((key) => {
          const card = cards[key];
          return (
            <MetricCard
              key={key}
              title={card.title}
              value={card.value}
              icon={card.icon}
              description={card.description}
              change={card.change}
              changeType={card.change === "live" ? "positive" : "neutral"}
            />
          );
        })}
      </div>

      {/* Tiendas con los módulos habilitados para el perfil */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tiendas</CardTitle>
            <CardDescription>Módulos disponibles para tu perfil</CardDescription>
          </div>
          {canManageStores && (
            <Link href="/stores/new">
              <Badge variant="outline" className="cursor-pointer hover:bg-accent">
                + Nueva Tienda
              </Badge>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {stores.length === 0 ? (
            <div className="py-12 text-center">
              <StoreIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">Sin tiendas</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {canManageStores
                  ? "Crea tu primera tienda para comenzar a recibir datos."
                  : "Todavía no tenés tiendas asignadas. Consultá con el administrador."}
              </p>
              {canManageStores && (
                <Link href="/stores/new">
                  <Badge className="mt-4 cursor-pointer">Crear Tienda</Badge>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => (
                <div key={store.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <Link href={`/stores/${store.id}`} className="flex-1 hover:underline">
                      <h3 className="font-semibold">{store.name}</h3>
                      {store.address && (
                        <p className="text-sm text-muted-foreground">{store.address}</p>
                      )}
                    </Link>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Horario</p>
                      <p className="font-medium">
                        {store.opening_time} - {store.closing_time}
                      </p>
                    </div>
                  </div>
                  {modules.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {modules.map((m) => (
                        <Link key={m.module} href={`/stores/${store.id}/${m.href}`}>
                          <Badge variant="secondary" className="cursor-pointer gap-1 hover:bg-accent">
                            <m.icon className="h-3 w-3" />
                            {m.title}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
