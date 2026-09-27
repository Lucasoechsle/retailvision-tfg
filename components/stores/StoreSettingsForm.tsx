"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Store } from "@/types";

interface StoreSettingsFormProps {
  store: Store;
}

/** HU-04: edición de los datos de la tienda y baja lógica / reactivación. */
export function StoreSettingsForm({ store }: StoreSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address || "");
  const [openingTime, setOpeningTime] = useState(store.opening_time.slice(0, 5));
  const [closingTime, setClosingTime] = useState(store.closing_time.slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          address: address || undefined,
          opening_time: openingTime,
          closing_time: closingTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error guardando la tienda");
      toast.success("Cambios guardados");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/stores/${store.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error dando de baja la tienda");
      toast.success(`${store.name} dada de baja. Su histórico se conserva.`);
      router.push("/stores");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
      setChangingStatus(false);
    }
  };

  const handleReactivate = async () => {
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error reactivando la tienda");
      toast.success(`${store.name} reactivada`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setChangingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la Tienda</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening">Horario de Apertura</Label>
                <Input
                  id="opening"
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing">Horario de Cierre</Label>
                <Input
                  id="closing"
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Zona horaria: {store.timezone} · ID: <code className="rounded bg-muted px-1">{store.id}</code>
            </p>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {store.is_active ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Dar de baja la tienda</CardTitle>
            <CardDescription>
              La tienda deja de aparecer en el sistema, pero se conserva todo su histórico
              (conteos, recorridos, transacciones y alertas). Podés reactivarla cuando quieras.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Dar de baja</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Dar de baja {store.name}?</DialogTitle>
                  <DialogDescription>
                    Es una baja lógica: no se borra ningún dato y la tienda puede reactivarse
                    desde el listado de tiendas.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                    Cancelar
                  </Button>
                  <Button variant="destructive" disabled={changingStatus} onClick={handleDeactivate}>
                    {changingStatus ? "Dando de baja..." : "Dar de baja"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Tienda dada de baja</CardTitle>
            <CardDescription>
              No aparece en el resto del sistema. Al reactivarla vuelve con todo su histórico.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={handleReactivate} disabled={changingStatus}>
              {changingStatus ? "Reactivando..." : "Reactivar tienda"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
