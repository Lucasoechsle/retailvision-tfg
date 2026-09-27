import { z } from "zod";

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const zoneFields = {
  name: z.string().min(1, "Nombre requerido"),
  zone_type: z.enum(["aisle", "gondola", "checkout", "entrance", "promo", "endcap", "storage", "other"]),
  polygon: z.array(pointSchema).min(3, "Mínimo 3 puntos para un polígono"),
  color: z.string(),
  floor_plan_id: z.string().uuid().optional(),
};

export const createZoneSchema = z.object({
  store_id: z.string().uuid(),
  ...zoneFields,
  zone_type: zoneFields.zone_type.default("aisle"),
  color: zoneFields.color.default("#3B82F6"),
});

// Sin valores por defecto: en zod 4, partial() igual los aplica y una actualización
// parcial (por ejemplo, redibujar la forma) pisaría el tipo y el color de la zona.
export const updateZoneSchema = z.object(zoneFields).partial();

export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
