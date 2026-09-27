import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isStoreScoped, normalizeRole, type Role } from "@/lib/auth/roles";

export interface OrganizationUser {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  store_ids: string[] | null;
  created_at: string;
}

/**
 * Miembros de una organización. Usa el cliente de servicio porque la política RLS de
 * user_profiles solo deja leer el propio perfil; llamarla únicamente después de
 * verificar que quien consulta es administrador de esa organización.
 */
export async function getOrganizationUsers(organizationId: string): Promise<OrganizationUser[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("user_profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at");

  if (!profiles || profiles.length === 0) return [];

  const emails: Record<string, string | null> = {};
  await Promise.all(
    profiles.map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      emails[p.id] = data.user?.email ?? null;
    })
  );

  return profiles.map((p) => ({
    id: p.id,
    email: emails[p.id],
    full_name: p.full_name,
    role: normalizeRole(p.role),
    store_ids: p.store_ids ?? null,
    created_at: p.created_at,
  }));
}

/**
 * Normaliza las tiendas a cargo de un usuario: solo aplican al gerente de tienda
 * (para el resto, o si no se elige ninguna, se guarda null = todas). Devuelve
 * "invalid" si alguna tienda no pertenece a la organización.
 */
export async function resolveStoreIds(
  role: Role,
  storeIds: string[] | undefined,
  organizationId: string
): Promise<string[] | null | "invalid"> {
  if (!isStoreScoped(role) || !storeIds || storeIds.length === 0) return null;

  const supabase = createClient();
  const { data: stores } = await supabase
    .from("stores")
    .select("id")
    .eq("organization_id", organizationId)
    .in("id", storeIds);

  const unique = Array.from(new Set(storeIds));
  if ((stores || []).length !== unique.length) return "invalid";
  return unique;
}
