import { z } from "zod";
import { CAMPAIGN_TYPES, type CampaignType } from "@/lib/campaigns";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida: usar el formato AAAA-MM-DD");

// Sin valores por defecto: zod 4 los aplica también en .partial() y pisaría campos en una edición
const campaignFields = {
  zone_id: z.string().uuid("Zona inválida").nullable(),
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120, "El nombre es demasiado largo"),
  description: z.string().trim().max(500, "La descripción es demasiado larga").nullable(),
  campaign_type: z.enum(Object.keys(CAMPAIGN_TYPES) as [CampaignType, ...CampaignType[]], {
    message: "Tipo de campaña inválido",
  }),
  product_category: z.string().trim().max(120, "La categoría es demasiado larga").nullable(),
  promo_cost: z.number().min(0, "El costo de exhibición no puede ser negativo").max(10_000_000_000).nullable(),
  start_date: isoDate,
  end_date: isoDate,
  baseline_start: isoDate,
  baseline_end: isoDate,
};

export const createCampaignSchema = z.object({
  store_id: z.string().uuid("Tienda inválida"),
  ...campaignFields,
  zone_id: campaignFields.zone_id.optional(),
  description: campaignFields.description.optional(),
  campaign_type: campaignFields.campaign_type.optional(),
  product_category: campaignFields.product_category.optional(),
  promo_cost: campaignFields.promo_cost.optional(),
});

export const updateCampaignSchema = z.object(campaignFields).partial().extend({
  /** true: dar de baja · false: reactivar (el estado vuelve a depender de las fechas). */
  cancelled: z.boolean().optional(),
});

/** Coherencia de las fechas de una campaña; devuelve el error o null. */
export function campaignDatesError(d: {
  start_date: string;
  end_date: string;
  baseline_start: string;
  baseline_end: string;
}): string | null {
  if (d.end_date < d.start_date) return "La campaña no puede terminar antes de empezar";
  if (d.baseline_end < d.baseline_start) return "El período previo no puede terminar antes de empezar";
  if (d.baseline_end >= d.start_date) return "El período previo tiene que terminar antes del inicio de la campaña";
  return null;
}
