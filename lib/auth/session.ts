import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessStoreModule,
  isStoreScoped,
  normalizeRole,
  type Role,
  type StoreModule,
} from "@/lib/auth/roles";
import type { Store } from "@/types";

/** Usuario autenticado con su perfil dentro de la organización. */
export interface Session {
  userId: string;
  email: string | null;
  organizationId: string;
  role: Role;
  fullName: string | null;
  /** Sucursales a cargo del gerente de tienda; null o vacío = todas. */
  storeIds: string[] | null;
}

/** Sesión de la request actual (se consulta una sola vez por request). */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    organizationId: profile.organization_id,
    role: normalizeRole(profile.role),
    fullName: profile.full_name ?? null,
    storeIds: profile.store_ids ?? null,
  };
});

/**
 * Indica si la sesión puede ver una sucursal. Una sucursal dada de baja solo la ve
 * el administrador (para consultar su histórico o reactivarla); el gerente de tienda
 * solo ve las sucursales que tiene asignadas.
 */
export function canAccessStore(session: Session, store: Pick<Store, "id" | "is_active">): boolean {
  if (!store.is_active && session.role !== "owner") return false;
  if (isStoreScoped(session.role) && session.storeIds?.length) {
    return session.storeIds.includes(store.id);
  }
  return true;
}

/** Sucursales activas que la sesión puede ver, ordenadas por nombre. */
export async function getAccessibleStores(session: Session): Promise<Store[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("stores")
    .select("*")
    .eq("organization_id", session.organizationId)
    .eq("is_active", true)
    .order("name");

  return (data || []).filter((store) => canAccessStore(session, store));
}

export type StoreAccess =
  | { status: "ok"; session: Session; store: Store }
  | { status: "denied"; session: Session }
  | { status: "not_found" }
  | { status: "unauthenticated" };

/** Guarda de las páginas de una sucursal: valida sesión, sucursal y módulo según el rol. */
export async function getStoreAccess(storeId: string, module: StoreModule): Promise<StoreAccess> {
  const session = await getSession();
  if (!session) return { status: "unauthenticated" };

  const supabase = createClient();
  const { data: store } = await supabase.from("stores").select("*").eq("id", storeId).single();
  if (!store || store.organization_id !== session.organizationId) return { status: "not_found" };

  if (!canAccessStore(session, store) || !canAccessStoreModule(session.role, module)) {
    return { status: "denied", session };
  }

  return { status: "ok", session, store };
}
