"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import type { Store, Transaction } from "@/types";

interface ConversionViewProps {
  store: Store;
  transactions: Transaction[];
}

export function ConversionView({ store, transactions }: ConversionViewProps) {
  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const totalItems = transactions.reduce((sum, t) => sum + t.items_count, 0);
  const avgTicket = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversión</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Conversión"
          value="--"
          icon={TrendingUp}
          description="conecta POS + cámaras"
        />
        <MetricCard
          title="Transacciones"
          value={transactions.length}
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
              <p className="text-sm">Integra tu sistema POS para ver datos de ventas</p>
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
