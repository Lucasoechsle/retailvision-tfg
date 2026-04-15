import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StoresList } from "@/components/stores/StoresList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tiendas",
};

export default async function StoresPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id, role")
    .eq("id", user!.id)
    .single();

  const { data: stores } = await supabase
    .from("stores")
    .select("*")
    .eq("organization_id", profile?.organization_id)
    .order("name");

  return <StoresList stores={stores || []} userRole={profile?.role || "viewer"} />;
}
