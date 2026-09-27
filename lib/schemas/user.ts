import { z } from "zod";
import { ROLES } from "@/lib/auth/roles";

export const roleSchema = z.enum(ROLES);

/** Tiendas a cargo del gerente de tienda; vacío = todas. */
export const storeIdsSchema = z.array(z.string().uuid()).optional();

export const inviteUserSchema = z.object({
  email: z.string().email("Email inválido"),
  role: roleSchema,
  full_name: z.string().min(1).optional(),
  store_ids: storeIdsSchema,
});

export const updateUserSchema = z.object({
  role: roleSchema,
  store_ids: storeIdsSchema,
});
