"use client";

import { MetricCard } from "./MetricCard";
import { Users, TrendingUp, Store as StoreIcon, Activity, Clock, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Store } from "@/types";

interface DashboardOverviewProps {
  stores: Store[];
  devicesOnline: number;
  devicesTotal: number;
  totalVisitorsToday: number;
  conversionRate: number | null;
}

export function DashboardOverview({
  stores,
  devicesOnline,
  devicesTotal,
  totalVisitorsToday,
  conversionRate,
}: DashboardOverviewProps) {
  const activeStores = stores.filter((s) => s.is_active).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-muted-foreground">
          Resumen de actividad de todas tus tiendas
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tiendas Activas"
          value={`${activeStores}/${stores.length}`}
          icon={StoreIcon}
          description="registradas"
        />
        <MetricCard
          title="Dispositivos Online"
          value={devicesOnline}
          icon={Activity}
          change={devicesTotal > 0 ? `de ${devicesTotal}` : undefined}
          changeType="neutral"
        />
        <MetricCard
          title="Visitantes Hoy"
          value={totalVisitorsToday > 0 ? totalVisitorsToday.toLocaleString("es") : "--"}
          icon={Users}
          description={totalVisitorsToday > 0 ? "todas las tiendas" : "conecta dispositivos"}
        />
        <MetricCard
          title="Tasa de Conversión"
          value={conversionRate !== null ? `${conversionRate}%` : "--"}
          icon={TrendingUp}
          description={conversionRate !== null ? "visitantes que compran" : "conecta POS"}
        />
      </div>

      {/* Stores List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tiendas</CardTitle>
          <Link href="/stores/new">
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">
              + Nueva Tienda
            </Badge>
          </Link>
        </CardHeader>
        <CardContent>
          {stores.length === 0 ? (
            <div className="py-12 text-center">
              <StoreIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">Sin tiendas</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Crea tu primera tienda para comenzar a recibir datos.
              </p>
              <Link href="/stores/new">
                <Badge className="mt-4 cursor-pointer">Crear Tienda</Badge>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/stores/${store.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{store.name}</h3>
                    {store.address && (
                      <p className="text-sm text-muted-foreground">
                        {store.address}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Horario</p>
                      <p className="font-medium">
                        {store.opening_time} - {store.closing_time}
                      </p>
                    </div>
                    <Badge variant={store.is_active ? "default" : "secondary"}>
                      {store.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
