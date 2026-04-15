"use client";

import { useState, useEffect } from "react";
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
  Clock,
  Users,
  ShoppingCart,
  Activity,
  Wifi,
} from "lucide-react";

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
  rule_id: string;
  store_id: string;
  triggered_at: string;
  resolved_at: string | null;
  data: any;
  status: string;
  alert_rules: { name: string; rule_type: string } | null;
}

const ruleTypeConfig: Record<string, { icon: typeof Bell; label: string; color: string }> = {
  queue_length: { icon: ShoppingCart, label: "Cola Larga", color: "text-red-500" },
  occupancy: { icon: Users, label: "Ocupación", color: "text-amber-500" },
  zone_empty: { icon: Activity, label: "Zona Vacía", color: "text-blue-500" },
  device_offline: { icon: Wifi, label: "Device Offline", color: "text-gray-500" },
  traffic_anomaly: { icon: AlertTriangle, label: "Anomalía Tráfico", color: "text-purple-500" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: "destructive", label: "Activa" },
  acknowledged: { color: "default", label: "Vista" },
  resolved: { color: "secondary", label: "Resuelta" },
};

export function AlertsView({ stores }: { stores: Store[] }) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id || "");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    rule_type: "queue_length",
    config: {} as Record<string, any>,
  });

  const fetchData = async () => {
    if (!selectedStore) return;
    setLoading(true);
    try {
      const [rulesRes, eventsRes] = await Promise.all([
        fetch(`/api/alerts?storeId=${selectedStore}`),
        fetch(`/api/alerts/events?storeId=${selectedStore}&status=${statusFilter}`),
      ]);
      const rulesData = await rulesRes.json();
      const eventsData = await eventsRes.json();
      setRules(rulesData.rules || []);
      setEvents(eventsData.events || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedStore, statusFilter]);

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

  const activeEvents = events.filter((e) => e.status === "active").length;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={selectedStore} onValueChange={setSelectedStore}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar tienda" />
          </SelectTrigger>
          <SelectContent>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="acknowledged">Vistas</SelectItem>
            <SelectItem value="resolved">Resueltas</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" /> Actualizar
        </Button>
        <div className="flex-1" />
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
                    {Object.entries(ruleTypeConfig).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Reglas Activas" value={rules.length} icon={Shield} />
        <MetricCard
          title="Alertas Activas"
          value={activeEvents}
          icon={Bell}
          changeType={activeEvents > 0 ? "negative" : "positive"}
        />
        <MetricCard title="Total Eventos" value={events.length} icon={Clock} />
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
                        <p className="text-xs text-muted-foreground">{rc.label}</p>
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
              {events.length} evento(s) con estado &quot;{statusFilter}&quot;
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Sin alertas {statusFilter === "active" ? "activas" : ""}</p>
                <p className="text-sm">El sistema está funcionando correctamente</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => {
                  const ruleType = event.alert_rules?.rule_type || "traffic_anomaly";
                  const rc = ruleTypeConfig[ruleType] || ruleTypeConfig.traffic_anomaly;
                  const Icon = rc.icon;
                  const sc = statusConfig[event.status] || statusConfig.active;

                  return (
                    <div key={event.id} className="flex items-start gap-3 rounded-lg border p-4">
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${rc.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {event.alert_rules?.name || "Alerta"}
                          </p>
                          <Badge variant={sc.color as any} className="text-xs">
                            {sc.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(event.triggered_at).toLocaleString("es", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {event.data?.values && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(event.data.values).slice(0, 100)}
                          </p>
                        )}
                      </div>
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
