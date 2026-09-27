"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/dashboard/MetricCard";
import {
  Camera,
  Plus,
  Wifi,
  WifiOff,
  Settings2,
  MoreHorizontal,
  Pencil,
  KeyRound,
  Trash2,
  Copy,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { toast } from "sonner";
import type { Store, Device } from "@/types";

interface StoreDevicesViewProps {
  store: Store;
  devices: Device[];
}

const STATUS: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  online: { label: "En línea", variant: "default" },
  offline: { label: "Sin conexión", variant: "destructive" },
  error: { label: "Error", variant: "destructive" },
};

function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "hace segundos";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} días`;
}

type Pending =
  | { kind: "create" }
  | { kind: "rename"; device: Device }
  | { kind: "regenerate"; device: Device }
  | { kind: "deactivate"; device: Device }
  | null;

/** HU-05: alta, listado, edición, baja y regeneración de la clave de los dispositivos de borde. */
export function StoreDevicesView({ store, devices }: StoreDevicesViewProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  // Clave recién generada: se muestra completa una sola vez
  const [revealed, setRevealed] = useState<{ device: string; key: string; regenerated: boolean } | null>(null);

  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.length - online;

  const open = (next: Pending) => {
    setPending(next);
    setName(next && next.kind === "rename" ? next.device.name : "");
  };

  const request = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "No se pudo completar la acción");
    return data;
  };

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "create") {
        const data = await request("/api/devices", "POST", { store_id: store.id, name: name.trim() });
        setRevealed({ device: data.device.name, key: data.device.api_key, regenerated: false });
      } else if (pending.kind === "rename") {
        await request(`/api/devices/${pending.device.id}`, "PATCH", { name: name.trim() });
        toast.success("Dispositivo renombrado");
      } else if (pending.kind === "regenerate") {
        const data = await request(`/api/devices/${pending.device.id}/regenerate-key`, "POST");
        setRevealed({ device: pending.device.name, key: data.api_key, regenerated: true });
      } else {
        await request(`/api/devices/${pending.device.id}`, "DELETE");
        toast.success(`${pending.device.name} dado de baja. Su histórico se conserva.`);
      }
      setPending(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    if (!revealed) return;
    await navigator.clipboard.writeText(revealed.key);
    toast.success("Clave copiada");
  };

  const dialogText = {
    create: { title: "Agregar dispositivo", action: "Agregar" },
    rename: { title: "Renombrar dispositivo", action: "Guardar" },
    regenerate: { title: "¿Regenerar la clave?", action: "Regenerar clave" },
    deactivate: { title: "¿Dar de baja el dispositivo?", action: "Dar de baja" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dispositivos</h1>
          <p className="mt-1 text-muted-foreground">{store.name}</p>
        </div>
        <Button onClick={() => open({ kind: "create" })}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Dispositivo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Total" value={devices.length} icon={Camera} />
        <MetricCard title="En línea" value={online} icon={Wifi} changeType="positive" />
        <MetricCard
          title="Sin conexión"
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
                  <TableHead>Último heartbeat</TableHead>
                  <TableHead>Clave</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  const status = STATUS[device.status] || STATUS.offline;
                  return (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {device.last_seen_at ? (
                          <span
                            title={new Date(device.last_seen_at).toLocaleString("es-AR")}
                            suppressHydrationWarning
                          >
                            {timeAgo(device.last_seen_at)}
                          </span>
                        ) : (
                          "Nunca"
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs">
                          {device.api_key.slice(0, 10)}…
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/stores/${store.id}/devices/${device.id}/setup`}>
                              <Settings2 className="mr-1 h-3 w-3" />
                              Calibrar
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Acciones de ${device.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            {/* Sin devolver el foco al botón: si no, el diálogo que abre la acción se cierra solo */}
                            <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                              <DropdownMenuItem onClick={() => open({ kind: "rename", device })}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Renombrar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => open({ kind: "regenerate", device })}>
                                <KeyRound className="mr-2 h-4 w-4" />
                                Regenerar clave
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => open({ kind: "deactivate", device })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Dar de baja
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alta, renombrar, regenerar clave y baja */}
      <Dialog open={pending !== null} onOpenChange={(isOpen) => !isOpen && setPending(null)}>
        <DialogContent>
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle>{dialogText[pending.kind].title}</DialogTitle>
                {pending.kind === "regenerate" && (
                  <DialogDescription>
                    Se genera una clave nueva para {pending.device.name} y la actual deja de
                    funcionar en el momento. El dispositivo no enviará datos hasta que actualices
                    su configuración con la clave nueva.
                  </DialogDescription>
                )}
                {pending.kind === "deactivate" && (
                  <DialogDescription>
                    {pending.device.name} deja de aparecer y su clave deja de ser aceptada, pero se
                    conserva todo el histórico de conteos y mapas de calor que registró.
                  </DialogDescription>
                )}
              </DialogHeader>
              {(pending.kind === "create" || pending.kind === "rename") && (
                <div className="space-y-2">
                  <Label htmlFor="device-name">Nombre</Label>
                  <Input
                    id="device-name"
                    placeholder="Cámara Entrada Principal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)}>
                  Cancelar
                </Button>
                <Button
                  variant={pending.kind === "deactivate" ? "destructive" : "default"}
                  disabled={busy || ((pending.kind === "create" || pending.kind === "rename") && !name.trim())}
                  onClick={confirm}
                >
                  {busy ? "Procesando..." : dialogText[pending.kind].action}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Clave del dispositivo: se muestra completa una sola vez */}
      <Dialog open={revealed !== null} onOpenChange={(isOpen) => !isOpen && setRevealed(null)}>
        <DialogContent>
          {revealed && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {revealed.regenerated ? "Clave regenerada" : "Dispositivo agregado"}: {revealed.device}
                </DialogTitle>
                <DialogDescription>
                  Configurala en el archivo <code>edge/.env</code> del dispositivo como{" "}
                  <code>DEVICE_API_KEY</code>. Por seguridad, no se vuelve a mostrar completa.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted px-3 py-2 text-sm">{revealed.key}</code>
                <Button variant="outline" size="icon" aria-label="Copiar clave" onClick={copyKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setRevealed(null)}>Listo</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
