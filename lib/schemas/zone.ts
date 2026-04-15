import { z } from "zod";

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const createZoneSchema = z.object({
  store_id: z.string().uuid(),
  name: z.string().min(1, "Nombre requerido"),
  zone_type: z.enum(["aisle", "checkout", "entrance", "promo", "endcap", "storage", "other"]).default("aisle"),
  polygon: z.array(pointSchema).min(3, "Mínimo 3 puntos para un polígono"),
  color: z.string().default("#3B82F6"),
  floor_plan_id: z.string().uuid().optional(),
});

export const updateZoneSchema = createZoneSchema.partial().omit({ store_id: true });

export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
