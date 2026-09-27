import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { getSession } from "@/lib/auth/session";
import { canAccessSection, ROLE_LABELS } from "@/lib/auth/roles";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const supabase = createClient();

  if (!session) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Usuario autenticado sin perfil: no redirigir a /login (el middleware lo devolvería acá)
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <p className="max-w-sm text-muted-foreground">
          Tu usuario no tiene un perfil asignado en ninguna organización. Contactá al
          administrador de tu organización.
        </p>
      </div>
    );
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("name, plan")
    .eq("id", session.organizationId)
    .single();

  const userName = session.fullName || session.email || "Usuario";
  const orgName = org?.name || "Mi Organización";
  const plan = org?.plan || "trial";

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar role={session.role} orgName={orgName} plan={plan} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={userName}
          userEmail={session.email ?? undefined}
          roleLabel={ROLE_LABELS[session.role]}
          showAlerts={canAccessSection(session.role, "alerts")}
        />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
