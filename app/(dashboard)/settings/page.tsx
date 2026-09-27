import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SettingsUsers } from "@/components/settings/SettingsUsers";
import { guardSection } from "@/lib/auth/guards";
import { getAccessibleStores } from "@/lib/auth/session";
import { can, isStoreScoped, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/roles";
import { getOrganizationUsers } from "@/lib/data/users";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const guard = await guardSection("settings");
  if (guard.denied) return guard.denied;
  const { session } = guard;

  const supabase = createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", session.organizationId)
    .single();

  const canManageUsers = can(session.role, "manage_users");
  const stores = await getAccessibleStores(session);
  const orgUsers = canManageUsers ? await getOrganizationUsers(session.organizationId) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">Gestiona tu cuenta y organización</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
          <CardDescription>Tu información personal</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-medium">{session.fullName || "Sin nombre"}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{session.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Perfil</span>
            <div className="text-right">
              <Badge variant="outline">{ROLE_LABELS[session.role]}</Badge>
              <p className="mt-1 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[session.role]}</p>
            </div>
          </div>
          {isStoreScoped(session.role) && (
            <>
              <Separator />
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Tiendas a cargo</span>
                <span className="text-right font-medium">
                  {stores.map((s) => s.name).join(", ") || "Ninguna"}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organización</CardTitle>
          <CardDescription>Información de tu empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-medium">{org?.name || "Sin organización"}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <Badge className="capitalize">{org?.plan || "trial"}</Badge>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Slug</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{org?.slug}</code>
          </div>
        </CardContent>
      </Card>

      {canManageUsers && (
        <SettingsUsers users={orgUsers} stores={stores} currentUserId={session.userId} />
      )}
    </div>
  );
}
