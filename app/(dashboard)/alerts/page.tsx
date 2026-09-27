import { guardSection } from "@/lib/auth/guards";
import { getAccessibleStores } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { AlertsView } from "@/components/alerts/AlertsView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Alertas" };

export default async function AlertsPage() {
  const guard = await guardSection("alerts");
  if (guard.denied) return guard.denied;

  const stores = await getAccessibleStores(guard.session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
        <p className="mt-1 text-muted-foreground">
          Reglas de alerta y notificaciones en tiempo real
        </p>
      </div>
      <AlertsView
        stores={stores}
        canManageRules={can(guard.session.role, "manage_alert_rules")}
      />
    </div>
  );
}
