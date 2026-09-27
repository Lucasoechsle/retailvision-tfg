import { createClient } from "@/lib/supabase/server";
import { guardSection } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Camera, Wifi, WifiOff } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dispositivos" };

export default async function DevicesPage() {
  const guard = await guardSection("devices");
  if (guard.denied) return guard.denied;

  const supabase = createClient();
  const { data: devices } = await supabase
    .from("devices")
    .select("*, stores!inner(name, organization_id, is_active)")
    .eq("stores.organization_id", guard.session.organizationId)
    .eq("stores.is_active", true)
    .eq("is_active", true)
    .order("name");

  const deviceList = devices || [];
  const online = deviceList.filter((d: any) => d.status === "online").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dispositivos</h1>
        <p className="mt-1 text-muted-foreground">
          Todos los dispositivos de tu organización
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Total" value={deviceList.length} icon={Camera} />
        <MetricCard title="Online" value={online} icon={Wifi} changeType="positive" />
        <MetricCard title="Offline" value={deviceList.length - online} icon={WifiOff} changeType={deviceList.length - online > 0 ? "negative" : "neutral"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Dispositivos</CardTitle>
        </CardHeader>
        <CardContent>
          {deviceList.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Camera className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Sin dispositivos registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tienda</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Conexión</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deviceList.map((device: any) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>{device.stores?.name}</TableCell>
                    <TableCell>
                      <Badge variant={device.status === "online" ? "default" : "destructive"}>
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString("es") : "Nunca"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
