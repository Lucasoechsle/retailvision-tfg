"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, DollarSign, ShoppingCart, TrendingUp, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Store, Transaction } from "@/types";

interface ConversionStats {
  totalVisitors: number;
  totalTransactions: number;
  totalRevenue: number;
}

interface ConversionViewProps {
  store: Store;
  transactions: Transaction[];
  stats?: ConversionStats;
}

export function ConversionView({ store, transactions, stats }: ConversionViewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: "", items_count: "1" });

  // Si hay stats agregados (del histórico) se usan; si no, fallback a las transacciones mostradas
  const txCount = stats?.totalTransactions ?? transactions.length;
  const totalRevenue =
    stats?.totalRevenue ?? transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const avgTicket = txCount > 0 ? totalRevenue / txCount : 0;
  const conversionRate =
    stats && stats.totalVisitors > 0 ? (stats.totalTransactions / stats.totalVisitors) * 100 : null;

  const handleCreate = async () => {
    const amount = parseFloat(form.amount);
    const items = parseInt(form.items_count, 10);
    if (!amount || amount <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          amount,
          items_count: items > 0 ? items : 1,
          source: "manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar la transacción");
      toast.success("Transacción cargada");
      setForm({ amount: "", items_count: "1" });
      setDialogOpen(false);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al cargar la transacción");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversión</h1>
          <p className="mt-1 text-muted-foreground">{store.name}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Cargar Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cargar transacción manual</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Monto ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Ej: 12500"
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad de ítems</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.items_count}
                  onChange={(e) => setForm({ ...form, items_count: e.target.value })}
                  placeholder="1"
                />
              </div>
              <Button onClick={handleCreate} disabled={saving} className="w-full">
                {saving ? "Guardando..." : "Cargar Transacción"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Conversión"
          value={conversionRate !== null ? `${conversionRate.toFixed(1)}%` : "--"}
          icon={TrendingUp}
          description={conversionRate !== null ? "visitantes que compran" : "sin datos de visitantes"}
        />
        <MetricCard
          title="Transacciones"
          value={txCount.toLocaleString("es")}
          icon={ShoppingCart}
        />
        <MetricCard
          title="Revenue"
          value={`$${totalRevenue.toLocaleString("es", { minimumFractionDigits: 0 })}`}
          icon={DollarSign}
        />
        <MetricCard
          title="Ticket Promedio"
          value={`$${avgTicket.toFixed(0)}`}
          icon={Users}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ShoppingCart className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Sin transacciones registradas</p>
              <p className="text-sm">Carga una transacción manual o integra tu sistema POS</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fuente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {new Date(tx.timestamp).toLocaleString("es")}
                    </TableCell>
                    <TableCell>{tx.items_count}</TableCell>
                    <TableCell>${Number(tx.amount).toLocaleString("es")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tx.source}</Badge>
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
