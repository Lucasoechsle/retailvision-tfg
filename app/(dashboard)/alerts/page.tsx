import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AlertsView } from "@/components/alerts/AlertsView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Alertas" };

export default async function AlertsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name")
    .eq("organization_id", profile.organization_id)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alertas</h1>
        <p className="mt-1 text-muted-foreground">
          Reglas de alerta y notificaciones en tiempo real
        </p>
      </div>
      <AlertsView stores={stores || []} />
    </div>
  );
}
