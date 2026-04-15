"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import {
  Users,
  Clock,
  Camera,
  MapPin,
  Activity,
  BarChart3,
  Map,
  ArrowUpRight,
  Settings,
  Route,
  ShoppingCart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import type { Store, Device, Zone, HourlyTraffic } from "@/types";

interface StoreDetailProps {
  store: Store;
  devices: Device[];
  zones: Zone[];
  hourlyTraffic: HourlyTraffic[];
  currentInside: number;
}

export function StoreDetail({
  store,
  devices,
  zones,
  hourlyTraffic,
  currentInside,
}: StoreDetailProps) {
  const devicesOnline = devices.filter((d) => d.status === "online").length;

  const chartData = hourlyTraffic.map((h) => ({
    hour: `${h.hour.toString().padStart(2, "0")}:00`,
    Entradas: h.entries,
    Salidas: h.exits,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{store.name}</h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            {store.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {store.address}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {store.opening_time} - {store.closing_time}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={store.is_active ? "default" : "secondary"}>
            {store.is_active ? "Activa" : "Inactiva"}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/stores/${store.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Configurar
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="En Tienda Ahora"
          value={currentInside}
          icon={Activity}
          changeType={currentInside > 0 ? "positive" : "neutral"}
          change={currentInside > 0 ? "live" : undefined}
        />
        <MetricCard
          title="Zonas Definidas"
          value={zones.length}
          icon={Map}
        />
        <MetricCard
          title="Dwell Time Prom."
          value="--"
          icon={Clock}
          description="requiere zonas activas"
        />
        <MetricCard
          title="Dispositivos"
          value={`${devicesOnline}/${devices.length}`}
          icon={Camera}
          changeType={devicesOnline > 0 ? "positive" : "neutral"}
          change={devicesOnline > 0 ? "online" : undefined}
        />
      </div>

      {/* Hourly Traffic Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tráfico Promedio por Hora (últimos 7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="Entradas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Salidas" fill="hsl(0 84.2% 60.2%)" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "traffic", icon: BarChart3, title: "Tráfico", desc: "Entradas y salidas" },
          { href: "zones", icon: Map, title: "Zonas", desc: `${zones.length} zonas definidas` },
          { href: "heatmap", icon: Activity, title: "Mapa de Calor", desc: "Patrones de tráfico" },
          { href: "conversion", icon: Users, title: "Conversión", desc: "Visitantes vs ventas" },
          { href: "journeys", icon: Route, title: "Recorridos", desc: "Trayectoria del cliente" },
          { href: "queues", icon: ShoppingCart, title: "Colas", desc: "Tiempos de espera" },
        ].map((item) => (
          <Link key={item.href} href={`/stores/${store.id}/${item.href}`}>
            <Card className="cursor-pointer transition-colors hover:bg-accent/50">
              <CardContent className="flex items-center gap-3 p-4">
                <item.icon className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ArrowUpRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Devices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Dispositivos</CardTitle>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/stores/${store.id}/devices`}>Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Camera className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Sin dispositivos configurados</p>
              <p className="text-sm">Agrega cámaras para comenzar el tracking</p>
            </div>
          ) : (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{device.name}</span>
                  </div>
                  <Badge variant={device.status === "online" ? "default" : "destructive"}>
                    {device.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
