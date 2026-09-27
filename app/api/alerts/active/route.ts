import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authorize } from "@/lib/auth/api";
import { canAccessSection } from "@/lib/auth/roles";
import { getAccessibleStores } from "@/lib/auth/session";

/**
 * HU-12: resumen de alertas activas para la campana del encabezado, que lo consulta
 * cada 60 segundos y muestra una notificación en pantalla cuando llega una nueva.
 */
export async function GET() {
  const auth = await authorize();
  if (auth.error) return auth.error;
  if (!canAccessSection(auth.session.role, "alerts")) {
    return NextResponse.json({ count: 0, latest: null });
  }

  const stores = await getAccessibleStores(auth.session);
  if (stores.length === 0) return NextResponse.json({ count: 0, latest: null });

  const supabase = createClient();
  const { data, count } = await supabase
    .from("alert_events")
    .select("id, store_id, triggered_at, alert_rules(name)", { count: "exact" })
    .in(
      "store_id",
      stores.map((s) => s.id)
    )
    .eq("status", "active")
    .order("triggered_at", { ascending: false })
    .limit(1);

  const latest = data?.[0] as any;
  return NextResponse.json({
    count: count || 0,
    latest: latest
      ? {
          id: latest.id,
          name: latest.alert_rules?.name || "Alerta",
          store: stores.find((s) => s.id === latest.store_id)?.name,
          triggered_at: latest.triggered_at,
        }
      : null,
  });
}
