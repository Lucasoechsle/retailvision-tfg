import { z } from "zod";

export const createStoreSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  address: z.string().optional(),
  timezone: z.string().default("America/Argentina/Cordoba"),
  opening_time: z.string().default("09:00"),
  closing_time: z.string().default("21:00"),
});

export const updateStoreSchema = createStoreSchema.partial();

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
