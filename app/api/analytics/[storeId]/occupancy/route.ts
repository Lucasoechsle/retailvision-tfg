import { NextRequest, NextResponse } from "next/server";
import { authorizeStore } from "@/lib/auth/api";
import { canAccessStoreModule } from "@/lib/auth/roles";
import { storeTimeZone } from "@/lib/dates";
import { getStoreOccupancy } from "@/lib/data/occupancy";

/** HU-09: ocupación actual, entradas y salidas del día y aforo máximo de la tienda. */
export async function GET(_request: NextRequest, { params }: { params: { storeId: string } }) {
  const auth = await authorizeStore(params.storeId);
  if (auth.error) return auth.error;
  if (!canAccessStoreModule(auth.session.role, "summary")) {
    return NextResponse.json({ error: "Tu perfil no tiene acceso al resumen de la tienda" }, { status: 403 });
  }

  const occupancy = await getStoreOccupancy(params.storeId, storeTimeZone(auth.store));
  return NextResponse.json(occupancy, { headers: { "Cache-Control": "no-store" } });
}
