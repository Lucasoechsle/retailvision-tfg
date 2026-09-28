"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { addDays, daysInclusive } from "@/lib/dates";
import { CAMPAIGN_TYPES, type Campaign } from "@/lib/campaigns";

/** Valor del selector de zona para una campaña de toda la tienda. */
const WHOLE_STORE = "store";

interface Zone {
  id: string;
  name: string;
  color: string;
}

interface CampaignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  zones: Zone[];
  /** Campaña a editar; sin ella, el formulario da de alta una nueva. */
  campaign?: Campaign | null;
  onSaved: (campaign: Campaign) => void;
}

const EMPTY_FORM = {
  name: "",
  description: "",
  campaign_type: "promo",
  zone_id: WHOLE_STORE,
  product_category: "",
  promo_cost: "",
  start_date: "",
  end_date: "",
  baseline_start: "",
  baseline_end: "",
};

function toForm(campaign?: Campaign | null) {
  if (!campaign) return EMPTY_FORM;
  return {
    name: campaign.name,
    description: campaign.description ?? "",
    campaign_type: campaign.campaign_type,
    zone_id: campaign.zone_id ?? WHOLE_STORE,
    product_category: campaign.product_category ?? "",
    promo_cost: campaign.promo_cost != null ? String(Number(campaign.promo_cost)) : "",
    start_date: campaign.start_date,
    end_date: campaign.end_date,
    baseline_start: campaign.baseline_start,
    baseline_end: campaign.baseline_end,
  };
}

/** HU-17: alta y edición de campañas promocionales. */
export function CampaignForm({ open, onOpenChange, storeId, zones, campaign, onSaved }: CampaignFormProps) {
  const [form, setForm] = useState(() => toForm(campaign));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!campaign;

  useEffect(() => {
    if (open) {
      setForm(toForm(campaign));
      setError(null);
    }
  }, [open, campaign]);

  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }));

  // Período previo sugerido: la misma cantidad de días, justo antes de la campaña
  const canSuggest = !!form.start_date && !!form.end_date && form.end_date >= form.start_date;
  const suggestBaseline = () => {
    if (!canSuggest) return;
    const length = daysInclusive(form.start_date, form.end_date);
    set({ baseline_start: addDays(form.start_date, -length), baseline_end: addDays(form.start_date, -1) });
  };

  const complete =
    form.name.trim() && form.start_date && form.end_date && form.baseline_start && form.baseline_end;

  const handleSave = async () => {
    setError(null);
    const cost = form.promo_cost.trim() === "" ? null : Number(form.promo_cost);
    if (cost != null && (!Number.isFinite(cost) || cost < 0)) {
      setError("El costo de exhibición tiene que ser un número mayor o igual a 0");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      campaign_type: form.campaign_type,
      zone_id: form.zone_id === WHOLE_STORE ? null : form.zone_id,
      product_category: form.product_category.trim() || null,
      promo_cost: cost,
      start_date: form.start_date,
      end_date: form.end_date,
      baseline_start: form.baseline_start,
      baseline_end: form.baseline_end,
    };

    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/campaigns/${campaign!.id}` : "/api/campaigns", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? payload : { ...payload, store_id: storeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar la campaña");
      toast.success(editing ? "Campaña actualizada" : "Campaña creada");
      onSaved(data.campaign);
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar campaña" : "Nueva campaña"}</DialogTitle>
          <DialogDescription>
            El estado se asigna según las fechas. El período previo es la base contra la que se mide la
            efectividad.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-name">Nombre</Label>
            <Input
              id="campaign-name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Ej.: Semana del Lácteo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-description">Descripción</Label>
            <Input
              id="campaign-description"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Opcional"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.campaign_type} onValueChange={(v) => set({ campaign_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMPAIGN_TYPES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Zona asociada</Label>
              <Select value={form.zone_id} onValueChange={(v) => set({ zone_id: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={WHOLE_STORE}>Toda la tienda</SelectItem>
                  {zones.map((z) => (
                    <SelectItem key={z.id} value={z.id}>
                      {z.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-category">Categoría</Label>
              <Input
                id="campaign-category"
                value={form.product_category}
                onChange={(e) => set({ product_category: e.target.value })}
                placeholder="Ej.: Lácteos"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-cost">Costo de exhibición ($)</Label>
              <Input
                id="campaign-cost"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={form.promo_cost}
                onChange={(e) => set({ promo_cost: e.target.value })}
                placeholder="Para estimar el ROI"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="campaign-start">Inicio de la campaña</Label>
              <Input
                id="campaign-start"
                type="date"
                value={form.start_date}
                onChange={(e) => set({ start_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="campaign-end">Fin de la campaña</Label>
              <Input
                id="campaign-end"
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(e) => set({ end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>Período previo (base de comparación)</Label>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                disabled={!canSuggest}
                onClick={suggestBaseline}
              >
                Usar los días anteriores a la campaña
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                aria-label="Inicio del período previo"
                type="date"
                value={form.baseline_start}
                onChange={(e) => set({ baseline_start: e.target.value })}
              />
              <Input
                aria-label="Fin del período previo"
                type="date"
                value={form.baseline_end}
                min={form.baseline_start || undefined}
                onChange={(e) => set({ baseline_end: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSave} disabled={saving || !complete} className="w-full">
            {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear campaña"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
