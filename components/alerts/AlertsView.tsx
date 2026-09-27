"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Shield,
  Plus,
  RefreshCw,
  Users,
  ShoppingCart,
  Activity,
  Wifi,
  Download,
  Eye,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ALERTS_CHANGED_EVENT } from "@/components/dashboard/AlertBell";
import {
  ALERT_STATUS_LABELS,
  ALERT_TYPE_LABELS,
  SEVERITY_LABELS,
  type AlertSeverity,
} from "@/lib/alerts/present";

interface Store {
  id: string;
  name: string;
}

interface AlertRule {
  id: string;
  store_id: string;
  name: string;
  rule_type: string;
  config: Record<string, any>;
  is_active: boolean;
}

interface AlertEvent {
  id: number;
  store_id: string;
  store_name: string;
  triggered_at: string;
  resolved_at: string | null;
  status: string;
  rule_name: string;
  rule_type: string;
  severity: AlertSeverity;
  zone: string;
  detail: string;
}

const ruleTypeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  queue_length: { icon: ShoppingCart, color: "text-red-500" },
  occupancy: { icon: Users, color: "text-amber-500" },
  zone_empty: { icon: Activity, color: "text-blue-500" },
  device_offline: { icon: Wifi, color: "text-gray-500" },
  traffic_anomaly: { icon: AlertTriangle, color: "text-purple-500" },
};

const statusVariant: Record<string, "destructive" | "default" | "secondary"> = {
  active: "destructive",
  acknowledged: "default",
  resolved: "secondary",
};

const severityClass: Record<AlertSeverity, string> = {
  critical: "border-red-500/50 text-red-500",
  high: "border-amber-500/50 text-amber-500",
  medium: "border-sky-500/50 text-sky-500",
};

interface AlertsViewProps {
  stores: Store[];
  /** HU-21: solo el administrador configura reglas de alerta. */
  canManageRules: boolean;
  /** HU-12: marcar alertas como vistas o resueltas. */
  canUpdateAlerts: boolean;
}

export function AlertsView({ stores, canManageRules, canUpdateAlerts }: AlertsViewProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    rule_type: "queue_length",
    config: {} as Record<string, any>,
  });

  // HU-22: filtros del historial (tienda, estado, tipo y rango de fechas)
  const filterParams = new URLSearchParams({
    storeId: selectedStore,
    status: statusFilter,
    type: typeFilter,
    ...(fromDate && { from: fromDate }),
    ...(toDate && { to: toDate }),
  }).toString();

  const fetchData = useCallback(async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const [rulesRes, eventsRes] = await Promise.all([
        fetch(`/api/alerts?storeId=${selectedStore}`),
        fetch(`/api/alerts/events?${filterParams}`),
      ]);
      const rulesData = await rulesRes.json();
      const eventsData = await eventsRes.json();
      setRules(rulesData.rules || []);
      setEvents(eventsData.events || []);
      setCounts(eventsData.counts || {});
    } finally {
      setLoading(false);
    }
  }, [selectedStore, filterParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: selectedStore,
          name: form.name,
          rule_type: form.rule_type,
          config: form.config,
        }),
      });
      const data = await res.json();
      if (data.rule) {
        setRules([data.rule, ...rules]);
        setDialogOpen(false);
        setForm({ name: "", rule_type: "queue_length", config: {} });
      }
    } finally {
      setCreating(false);
    }
  };

  /** HU-12: el gerente marca la alerta como vista o resuelta. */
  const updateStatus = async (event: AlertEvent, status: "acknowledged" | "resolved") => {
    setUpdating(event.id);
    try {
      const res = await fetch(`/api/alerts/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar la alerta");
      toast.success(
        status === "resolved" ? `"${event.rule_name}" resuelta` : `"${event.rule_name}" marcada como vista`
      );
      window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
      await fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const configFields: Record<string, Array<{ key: string; label: string; type: string; default: number }>> = {
    queue_length: [{ key: "max_people", label: "Máx. personas en cola", type: "number", default: 5 }],
    occupancy: [{ key: "max_occupancy", label: "Máx. ocupación", type: "number", default: 100 }],
    zone_empty: [{ key: "empty_minutes", label: "Minutos vacía", type: "number", default: 30 }],
    device_offline: [{ key: "offline_minutes", label: "Minutos offline", type: "number", default: 10 }],
    traffic_anomaly: [
      { key: "min_entries_expected", label: "Mín. entradas esperadas", type: "number", default: 0 },
      { key: "max_entries_expected", label: "Máx. entradas esperadas", type: "number", default: 100 },
    ],
  };

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1.5">
          <Label className="text-xs">Tienda</Label>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Seleccionar tienda" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Estado</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(ALERT_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="alerts-from" className="text-xs">Desde</Label>
          <Input
            id="alerts-from"
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="alerts-to" className="text-xs">Hasta</Label>
          <Input
            id="alerts-to"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/alerts/events?${filterParams}&format=csv`} download>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </a>
        </Button>
        <div className="flex-1" />
        {canManageRules && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nueva Regla</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Regla de Alerta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Cola larga en cajas" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.rule_type} onValueChange={(v) => setForm({ ...form, rule_type: v, config: {} })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ALERT_TYPE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(configFields[form.rule_type] || []).map((field) => (
                  <div key={field.key}>
                    <Label>{field.label}</Label>
                    <Input
                      type="number"
                      value={form.config[field.key] ?? field.default}
                      onChange={(e) => setForm({
                        ...form,
                        config: { ...form.config, [field.key]: parseInt(e.target.value, 10) },
                      })}
                    />
                  </div>
                ))}
                <Button onClick={handleCreate} disabled={creating || !form.name} className="w-full">
                  {creating ? "Creando..." : "Crear Regla"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Reglas Activas" value={rules.filter((r) => r.is_active).length} icon={Shield} />
        <MetricCard
          title="Alertas Activas"
          value={counts.active ?? 0}
          icon={Bell}
          description="sin revisar"
          changeType={(counts.active ?? 0) > 0 ? "negative" : "positive"}
        />
        <MetricCard title="Vistas" value={counts.acknowledged ?? 0} icon={Eye} description="pendientes de resolver" />
        <MetricCard title="Resueltas" value={counts.resolved ?? 0} icon={CheckCircle} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Reglas Configuradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Shield className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Sin reglas configuradas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule) => {
                  const rc = ruleTypeConfig[rule.rule_type] || ruleTypeConfig.traffic_anomaly;
                  const Icon = rc.icon;
                  return (
                    <div key={rule.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Icon className={`h-4 w-4 shrink-0 ${rc.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{rule.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ALERT_TYPE_LABELS[rule.rule_type] || rule.rule_type}
                        </p>
                      </div>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "ON" : "OFF"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Events */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Historial de Alertas
            </CardTitle>
            <CardDescription>
              {events.length} {events.length === 1 ? "alerta" : "alertas"}
              {statusFilter !== "all" && ` · ${ALERT_STATUS_LABELS[statusFilter].toLowerCase()}s`}
              {typeFilter !== "all" && ` · ${ALERT_TYPE_LABELS[typeFilter].toLowerCase()}`}
              {(fromDate || toDate) && ` · ${fromDate || "inicio"} a ${toDate || "hoy"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading && events.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Sin alertas para estos filtros</p>
              </div>
            ) : (
              <div className={cn("space-y-2", loading && "opacity-60")}>
                {events.map((event) => {
                  const rc = ruleTypeConfig[event.rule_type] || ruleTypeConfig.traffic_anomaly;
                  const Icon = rc.icon;
                  const busy = updating === event.id;

                  return (
                    <div key={event.id} className="flex items-start gap-3 rounded-lg border p-4">
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${rc.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm">{event.rule_name}</p>
                          <Badge variant={statusVariant[event.status] || "default"} className="text-xs">
                            {ALERT_STATUS_LABELS[event.status] || event.status}
                          </Badge>
                          <Badge variant="outline" className={cn("text-xs", severityClass[event.severity])}>
                            {SEVERITY_LABELS[event.severity]}
                          </Badge>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{ALERT_TYPE_LABELS[event.rule_type] || event.rule_type}</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {event.zone}
                          </span>
                          <span>{formatDateTime(event.triggered_at)}</span>
                          {event.resolved_at && <span>Resuelta: {formatDateTime(event.resolved_at)}</span>}
                        </p>
                        {event.detail && <p className="mt-1 text-sm">{event.detail}</p>}
                      </div>
                      {canUpdateAlerts && event.status !== "resolved" && (
                        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                          {event.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => updateStatus(event, "acknowledged")}
                            >
                              Marcar vista
                            </Button>
                          )}
                          <Button size="sm" disabled={busy} onClick={() => updateStatus(event, "resolved")}>
                            Resolver
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
