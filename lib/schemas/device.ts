import { z } from "zod";

export const createDeviceSchema = z.object({
  store_id: z.string().uuid("Store ID inválido"),
  name: z.string().min(1, "Nombre requerido"),
  config: z.record(z.string(), z.unknown()).optional().default({}),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
