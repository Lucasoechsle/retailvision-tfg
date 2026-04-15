import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, role, organization_id, organizations(name, plan)")
    .eq("id", user.id)
    .single();

  const userName = profile?.full_name || user.email || "Usuario";
  const orgName = (profile?.organizations as any)?.name || "Mi Organización";
  const plan = (profile?.organizations as any)?.plan || "trial";

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:flex">
        <Sidebar orgName={orgName} plan={plan} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} userEmail={user.email} />
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
