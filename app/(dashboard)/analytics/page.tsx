import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnalyticsOverview } from "@/components/analytics/AnalyticsOverview";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
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
    .select("id, name, address")
    .eq("organization_id", profile.organization_id)
    .order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics &amp; Insights</h1>
        <p className="mt-1 text-muted-foreground">
          Insights automáticos, predicciones y recomendaciones
        </p>
      </div>
      <AnalyticsOverview stores={stores || []} />
    </div>
  );
}
