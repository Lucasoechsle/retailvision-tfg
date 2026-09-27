import { notFound, redirect } from "next/navigation";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { canAccessSection, type Section, type StoreModule } from "@/lib/auth/roles";
import { getSession, getStoreAccess, type Session } from "@/lib/auth/session";
import type { Store } from "@/types";

type Denied = { denied: JSX.Element; session?: undefined; store?: undefined };

/**
 * Guarda de las páginas de sección (nivel organización). Si el perfil no tiene acceso,
 * devuelve la pantalla de acceso denegado para que la página la retorne.
 */
export async function guardSection(
  section: Section
): Promise<{ denied?: undefined; session: Session } | Denied> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canAccessSection(session.role, section)) {
    return { denied: <AccessDenied role={session.role} /> };
  }
  return { session };
}

/** Guarda de las páginas de una tienda: valida la tienda y el módulo según el perfil. */
export async function guardStoreModule(
  storeId: string,
  module: StoreModule
): Promise<{ denied?: undefined; session: Session; store: Store } | Denied> {
  const access = await getStoreAccess(storeId, module);
  if (access.status === "unauthenticated") redirect("/login");
  if (access.status === "not_found") notFound();
  if (access.status === "denied") return { denied: <AccessDenied role={access.session.role} /> };
  return { session: access.session, store: access.store };
}
