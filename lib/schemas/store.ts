import { z } from "zod";

const storeFields = {
  name: z.string().min(2, "Mínimo 2 caracteres"),
  address: z.string().optional(),
  timezone: z.string(),
  opening_time: z.string(),
  closing_time: z.string(),
};

export const createStoreSchema = z.object({
  ...storeFields,
  timezone: storeFields.timezone.default("America/Argentina/Cordoba"),
  opening_time: storeFields.opening_time.default("09:00"),
  closing_time: storeFields.closing_time.default("21:00"),
});

// Sin valores por defecto: en zod 4, partial() igual los aplica y una actualización
// parcial (por ejemplo, reactivar la tienda) pisaría el horario y la zona horaria.
export const updateStoreSchema = z.object(storeFields).partial().extend({
  // HU-04: false = baja lógica, true = reactivación (se conserva el histórico)
  is_active: z.boolean().optional(),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
