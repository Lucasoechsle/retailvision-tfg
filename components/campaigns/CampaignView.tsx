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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Megaphone,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  ShoppingCart,
  Plus,
  Target,
  Calendar,
  Eye,
} from "lucide-react";
import type { Store } from "@/types";

interface Zone {
  id: string;
  name: string;
  color: string;
}

interface Campaign {
  id: string;
  store_id: string;
  zone_id: string | null;
  name: string;
  description: string | null;
  campaign_type: string;
  start_date: string;
  end_date: string;
  baseline_start: string;
  baseline_end: string;
  status: string;
  zones: Zone | null;
}

interface CampaignViewProps {
  store: Store;
  campaigns: Campaign[];
  zones: Zone[];
}

const typeLabels: Record<string, string> = {
  promo: "Promoción",
  endcap: "Cabecera",
  island: "Isla",
  seasonal: "Estacional",
  layout_change: "Cambio Layout",
  other: "Otro",
};

const statusColors: Record<string, string> = {
  planned: "secondary",
  active: "default",
  completed: "outline",
  cancelled: "destructive",
};

function ChangeIndicator({ value, label }: { value: number | null; label: string }) {
  if (value === null) return null;
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`flex items-center gap-1 font-medium ${positive ? "text-emerald-500" : "text-red-500"}`}>
        <Icon className="h-3.5 w-3.5" />
        {positive ? "+" : ""}{value}%
      </span>
    </div>
  );
}

function CampaignDetail({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Cargando...</div>;
  if (!data?.campaign) return <div className="py-8 text-center text-muted-foreground">Error al cargar</div>;

  const { campaign, baseline, campaign_metrics, changes, daily_data } = data;

  const chartData = (daily_data || []).map((d: any) => ({
    date: new Date(`${d.date}T12:00:00`).toLocaleDateString("es", { day: "2-digit", month: "short" }),
    visitantes: d.total_visitors || 0,
    transacciones: d.total_transactions || 0,
    isCampaign: d.date >= campaign.start_date && d.date <= campaign.end_date,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Baseline</p>
          <p className="text-lg font-bold">{baseline?.avg_daily_visitors?.toFixed(0) || 0}</p>
          <p className="text-xs text-muted-foreground">visitantes/día</p>
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Campaña</p>
          <p className="text-lg font-bold">{campaign_metrics?.avg_daily_visitors?.toFixed(0) || 0}</p>
          <p className="text-xs text-muted-foreground">visitantes/día</p>
        </div>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground mb-2">Cambios vs Baseline</p>
        <ChangeIndicator value={changes.visitors} label="Visitantes/día" />
        <ChangeIndicator value={changes.zone_visits} label="Visitas zona" />
        <ChangeIndicator value={changes.dwell_time} label="Dwell time" />
        <ChangeIndicator value={changes.engagement} label="Engagement" />
        <ChangeIndicator value={changes.transactions} label="Transacciones" />
        <ChangeIndicator value={changes.conversion} label="Conversión" />
      </div>

      {chartData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Visitantes por Día</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--foreground))",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="visitantes"
                fill="hsl(var(--primary))"
                radius={[2, 2, 0, 0]}
                name="Visitantes"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function CampaignView({ store, campaigns: initialCampaigns, zones }: CampaignViewProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    campaign_type: "promo",
    zone_id: "",
    start_date: "",
    end_date: "",
    baseline_start: "",
    baseline_end: "",
  });

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          store_id: store.id,
          zone_id: form.zone_id || null,
        }),
      });
      const data = await res.json();
      if (data.campaign) {
        setCampaigns([data.campaign, ...campaigns]);
        setDialogOpen(false);
        setForm({ name: "", description: "", campaign_type: "promo", zone_id: "", start_date: "", end_date: "", baseline_start: "", baseline_end: "" });
      }
    } finally {
      setCreating(false);
    }
  };

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const completedCampaigns = campaigns.filter((c) => c.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
          <p className="mt-1 text-muted-foreground">{store.name}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nueva Campaña</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Crear Campaña</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Promo Verano 2026" />
              </div>
              <div>
                <Label>Descripción</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción opcional" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.campaign_type} onValueChange={(v) => setForm({ ...form, campaign_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Zona (opcional)</Label>
                  <Select value={form.zone_id} onValueChange={(v) => setForm({ ...form, zone_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      {zones.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inicio Campaña</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <Label>Fin Campaña</Label>
                  <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inicio Baseline</Label>
                  <Input type="date" value={form.baseline_start} onChange={(e) => setForm({ ...form, baseline_start: e.target.value })} />
                </div>
                <div>
                  <Label>Fin Baseline</Label>
                  <Input type="date" value={form.baseline_end} onChange={(e) => setForm({ ...form, baseline_end: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating || !form.name || !form.start_date || !form.end_date || !form.baseline_start || !form.baseline_end} className="w-full">
                {creating ? "Creando..." : "Crear Campaña"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Total Campañas" value={campaigns.length} icon={Megaphone} />
        <MetricCard title="Activas" value={activeCampaigns} icon={Target} changeType={activeCampaigns > 0 ? "positive" : "neutral"} />
        <MetricCard title="Completadas" value={completedCampaigns} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Campaign List */}
        <Card>
          <CardHeader>
            <CardTitle>Campañas</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Megaphone className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Sin campañas aún</p>
                <p className="text-sm">Crea una para medir su impacto</p>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent/50 ${
                      c.id === selectedId ? "border-primary bg-accent/30" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabels[c.campaign_type] || c.campaign_type}
                          {c.zones ? ` · ${c.zones.name}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-xs text-muted-foreground">
                          {c.start_date} → {c.end_date}
                        </span>
                        <Badge variant={statusColors[c.status] as any}>
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Detail */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {selectedId ? "Resultados" : "Selecciona una campaña"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedId ? (
              <CampaignDetail campaignId={selectedId} />
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Target className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>Selecciona una campaña para ver sus métricas comparativas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
