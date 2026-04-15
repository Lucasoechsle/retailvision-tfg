"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Camera, Plus, Activity, Wifi, WifiOff, Clock, Settings2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import type { Store, Device } from "@/types";

interface StoreDevicesViewProps {
  store: Store;
  devices: Device[];
}

export function StoreDevicesView({ store, devices }: StoreDevicesViewProps) {
  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dispositivos</h1>
          <p className="mt-1 text-muted-foreground">{store.name}</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Dispositivo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Total" value={devices.length} icon={Camera} />
        <MetricCard
          title="Online"
          value={online}
          icon={Wifi}
          changeType="positive"
        />
        <MetricCard
          title="Offline"
          value={offline}
          icon={WifiOff}
          changeType={offline > 0 ? "negative" : "neutral"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Dispositivos</CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Camera className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Sin dispositivos</p>
              <p className="text-sm">Agrega tu primera cámara para comenzar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Conexión</TableHead>
                  <TableHead>API Key</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          device.status === "online" ? "default" : "destructive"
                        }
                      >
                        {device.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {device.last_seen_at
                        ? new Date(device.last_seen_at).toLocaleString("es")
                        : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {device.api_key.slice(0, 12)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/stores/${store.id}/devices/${device.id}/setup`}>
                          <Settings2 className="mr-1 h-3 w-3" />
                          Calibrar
                        </Link>
                      </Button>
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
