"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Megaphone, Plus, Target, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_TYPES,
  type Campaign,
} from "@/lib/campaigns";
import { CampaignForm } from "./CampaignForm";
import { CampaignAnalysis } from "./CampaignAnalysis";
import type { Store } from "@/types";

interface Zone {
  id: string;
  name: string;
  color: string;
}

interface CampaignViewProps {
  store: Store;
  /** Campañas con el estado que corresponde a sus fechas. */
  campaigns: Campaign[];
  zones: Zone[];
  /** Puede crear, editar y dar de baja campañas (HU-17). */
  canManage: boolean;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  planned: "secondary",
  active: "default",
  completed: "outline",
  cancelled: "destructive",
};

const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

export function CampaignView({ store, campaigns: initialCampaigns, zones, canManage }: CampaignViewProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  // Arranca mostrando la efectividad de la última campaña finalizada
  const [selectedId, setSelectedId] = useState<string | null>(
    () => (initialCampaigns.find((c) => c.status === "completed") ?? initialCampaigns[0])?.id ?? null
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const selected = campaigns.find((c) => c.id === selectedId) ?? null;

  const upsert = (campaign: Campaign) => {
    setCampaigns((list) => {
      const exists = list.some((c) => c.id === campaign.id);
      const next = exists ? list.map((c) => (c.id === campaign.id ? campaign : c)) : [campaign, ...list];
      return next.sort((a, b) => b.start_date.localeCompare(a.start_date));
    });
    setSelectedId(campaign.id);
    setRefreshKey((k) => k + 1);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = () => {
    if (!selected) return;
    setEditing(selected);
    setFormOpen(true);
  };

  const setCancelled = async (cancelled: boolean) => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo actualizar la campaña");
      upsert(data.campaign);
      toast.success(cancelled ? "Campaña dada de baja" : "Campaña reactivada");
      setConfirmCancel(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const completedCount = campaigns.filter((c) => c.status === "completed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promociones</h1>
          <p className="mt-1 text-muted-foreground">{store.name}</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Nueva campaña
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Campañas" value={campaigns.length} icon={Megaphone} />
        <MetricCard
          title="Activas"
          value={activeCount}
          icon={Target}
          changeType={activeCount > 0 ? "positive" : "neutral"}
        />
        <MetricCard title="Finalizadas" value={completedCount} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Campañas</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Megaphone className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Todavía no hay campañas</p>
                {canManage && <p className="text-sm">Creá una para medir su impacto</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50",
                      c.id === selectedId ? "border-primary bg-accent/30" : "border-border",
                      c.status === "cancelled" && "opacity-70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {CAMPAIGN_TYPES[c.campaign_type as keyof typeof CAMPAIGN_TYPES] ?? c.campaign_type}
                          {" · "}
                          {c.zones?.name ?? "Toda la tienda"}
                          {c.product_category && ` · ${c.product_category}`}
                        </p>
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {shortDate(c.start_date)} al {shortDate(c.end_date)}/{c.end_date.slice(0, 4)}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANTS[c.status]} className="shrink-0">
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Efectividad</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <CampaignAnalysis
                campaignId={selected.id}
                refreshKey={refreshKey}
                canManage={canManage}
                onEdit={openEdit}
                onCancel={() => setConfirmCancel(true)}
                onReactivate={() => setCancelled(false)}
              />
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <Target className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Elegí una campaña para ver su impacto antes, durante y después</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canManage && (
        <CampaignForm
          open={formOpen}
          onOpenChange={setFormOpen}
          storeId={store.id}
          zones={zones}
          campaign={editing}
          onSaved={upsert}
        />
      )}

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de baja la campaña</DialogTitle>
            <DialogDescription>
              {selected?.name} queda como dada de baja. Sus métricas se conservan y se puede reactivar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)} disabled={busy}>
              Volver
            </Button>
            <Button variant="destructive" onClick={() => setCancelled(true)} disabled={busy}>
              {busy ? "Dando de baja…" : "Dar de baja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
