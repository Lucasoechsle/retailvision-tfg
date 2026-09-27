import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { can, type Action } from "@/lib/auth/roles";
import { canAccessStore, getSession, type Session } from "@/lib/auth/session";
import type { Store } from "@/types";

type Rejected = { error: NextResponse; session?: undefined; store?: undefined };

function reject(message: string, status: number): Rejected {
  return { error: NextResponse.json({ error: message }, { status }) };
}

/** Valida la sesión y, si se indica, que el rol pueda realizar la acción. */
export async function authorize(
  action?: Action
): Promise<{ error?: undefined; session: Session } | Rejected> {
  const session = await getSession();
  if (!session) return reject("No autenticado", 401);
  if (action && !can(session.role, action)) {
    return reject("Tu perfil no tiene permisos para esta acción", 403);
  }
  return { session };
}

/** Como authorize, y además valida que la sucursal pertenezca a la organización y sea visible para la sesión. */
export async function authorizeStore(
  storeId: string,
  action?: Action
): Promise<{ error?: undefined; session: Session; store: Store } | Rejected> {
  const auth = await authorize(action);
  if (auth.error) return auth;

  const supabase = createClient();
  const { data: store } = await supabase.from("stores").select("*").eq("id", storeId).single();
  if (!store || store.organization_id !== auth.session.organizationId) {
    return reject("Sucursal no encontrada en tu organización", 404);
  }
  if (!canAccessStore(auth.session, store)) {
    return reject("No tenés acceso a esta sucursal", 403);
  }

  return { session: auth.session, store };
}

/** Como authorize, y además valida que el dispositivo exista, esté activo y su tienda sea visible para la sesión. */
export async function authorizeDevice(
  deviceId: string,
  action?: Action
): Promise<{ error?: undefined; session: Session; device: { id: string; name: string; store_id: string } } | Rejected> {
  const auth = await authorize(action);
  if (auth.error) return auth;

  const supabase = createClient();
  const { data: device } = await supabase
    .from("devices")
    .select("id, name, store_id, is_active, stores(id, is_active, organization_id)")
    .eq("id", deviceId)
    .maybeSingle();

  const store = (device as any)?.stores;
  if (!device || !device.is_active || !store || store.organization_id !== auth.session.organizationId) {
    return reject("Dispositivo no encontrado", 404);
  }
  if (!canAccessStore(auth.session, store)) {
    return reject("No tenés acceso a esta tienda", 403);
  }

  return { session: auth.session, device: { id: device.id, name: device.name, store_id: device.store_id } };
}
