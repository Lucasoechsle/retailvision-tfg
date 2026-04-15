import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SettingsUsers } from "@/components/settings/SettingsUsers";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*, organizations(*)")
    .eq("id", user!.id)
    .single();

  const org = profile?.organizations as any;

  const { data: orgUsers } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, created_at")
    .eq("organization_id", profile?.organization_id)
    .order("created_at");

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
            <span className="font-medium">{profile?.full_name || "Sin nombre"}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Rol</span>
            <Badge variant="outline" className="capitalize">{profile?.role}</Badge>
          </div>
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

      <SettingsUsers
        users={orgUsers || []}
        currentUserRole={profile?.role || "viewer"}
      />
    </div>
  );
}
