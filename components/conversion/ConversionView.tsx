"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Plus, Upload, Download } from "lucide-react";
import { ConversionPerformance } from "./ConversionPerformance";
import { toast } from "sonner";
import type { Store, Transaction } from "@/types";

interface ImportResult {
  imported: number;
  rejected: number;
  errors: { line: number; message: string }[];
}

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  csv_import: "CSV",
  pos_api: "POS",
};

// Plantilla de importación (el prefijo %EF%BB%BF es el BOM, para que Excel respete los acentos)
const CSV_TEMPLATE_HREF =
  "data:text/csv;charset=utf-8,%EF%BB%BF" +
  encodeURIComponent("fecha;hora;monto;items\r\n26/09/2026;10:30;12.500,00;3\r\n26/09/2026;11:15;4.250,50;1\r\n");

/** Fecha y hora local actual en el formato del input datetime-local. */
function nowLocalInput(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

interface ConversionViewProps {
  store: Store;
  transactions: Transaction[];
  initialRange: { from: string; to: string };
}

export function ConversionView({ store, transactions, initialRange }: ConversionViewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: "", items_count: "1", timestamp: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Se incrementa al cargar o importar transacciones para recalcular los indicadores
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreate = async () => {
    const amount = parseFloat(form.amount);
    const items = parseInt(form.items_count, 10);
    if (!amount || amount <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }
    const timestamp = form.timestamp ? new Date(form.timestamp) : new Date();
    if (isNaN(timestamp.getTime()) || timestamp.getTime() > Date.now() + 5 * 60000) {
      toast.error("La fecha no puede ser posterior a hoy");
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
          timestamp: timestamp.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar la transacción");
      toast.success("Transacción cargada");
      setForm({ amount: "", items_count: "1", timestamp: "" });
      setDialogOpen(false);
      setRefreshKey((k) => k + 1);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Error al cargar la transacción");
    } finally {
      setSaving(false);
    }
  };

  /** HU-19: importación de transacciones desde un archivo CSV. */
  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const res = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store_id: store.id, csv: await file.text() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo importar el archivo");
      setImportResult(data);
      setRefreshKey((k) => k + 1);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conversión</h1>
          <p className="mt-1 text-muted-foreground">{store.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href={CSV_TEMPLATE_HREF} download="plantilla_transacciones.csv">
              <Download className="mr-2 h-4 w-4" /> Plantilla CSV
            </a>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
          <Button variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> {importing ? "Importando..." : "Importar CSV"}
          </Button>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (open) setForm((f) => ({ ...f, timestamp: nowLocalInput() }));
            }}
          >
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
                  <Label htmlFor="tx-timestamp">Fecha y hora</Label>
                  <Input
                    id="tx-timestamp"
                    type="datetime-local"
                    value={form.timestamp}
                    max={nowLocalInput()}
                    onChange={(e) => setForm({ ...form, timestamp: e.target.value })}
                  />
                </div>
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
      </div>

      {/* Resultado de la importación: filas registradas y rechazadas con su motivo */}
      <Dialog open={importResult !== null} onOpenChange={(open) => !open && setImportResult(null)}>
        <DialogContent className="max-w-lg">
          {importResult && (
            <>
              <DialogHeader>
                <DialogTitle>Importación de transacciones</DialogTitle>
                <DialogDescription>
                  {importResult.imported} {importResult.imported === 1 ? "transacción registrada" : "transacciones registradas"}
                  {importResult.rejected > 0 &&
                    ` · ${importResult.rejected} ${importResult.rejected === 1 ? "fila rechazada" : "filas rechazadas"}`}
                </DialogDescription>
              </DialogHeader>
              {importResult.errors.length > 0 && (
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-3 text-sm">
                  {importResult.errors.map((e) => (
                    <p key={e.line}>
                      <span className="font-medium">Línea {e.line}:</span>{" "}
                      <span className="text-muted-foreground">{e.message}</span>
                    </p>
                  ))}
                  {importResult.rejected > importResult.errors.length && (
                    <p className="text-muted-foreground">
                      y {importResult.rejected - importResult.errors.length} más
                    </p>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setImportResult(null)}>Listo</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConversionPerformance storeId={store.id} initialRange={initialRange} refreshKey={refreshKey} />

      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ShoppingCart className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Sin transacciones registradas</p>
              <p className="text-sm">Cargá una transacción manual o importá un CSV de tu sistema POS</p>
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
                    <TableCell className="tabular-nums">
                      {new Date(tx.timestamp).toLocaleString("es-AR", {
                        timeZone: store.timezone || "America/Argentina/Cordoba",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </TableCell>
                    <TableCell>{tx.items_count}</TableCell>
                    <TableCell>${Number(tx.amount).toLocaleString("es")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{SOURCE_LABELS[tx.source] || tx.source}</Badge>
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
