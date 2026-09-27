import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccessibleStores, getSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { StoresList } from "@/components/stores/StoresList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tiendas",
};

export default async function StoresPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const canManage = can(session.role, "manage_stores");
  const stores = await getAccessibleStores(session);

  // Las tiendas dadas de baja (HU-04) solo las ve el administrador, para poder reactivarlas
  let inactiveStores: typeof stores = [];
  if (canManage) {
    const supabase = createClient();
    const { data } = await supabase
      .from("stores")
      .select("*")
      .eq("organization_id", session.organizationId)
      .eq("is_active", false)
      .order("name");
    inactiveStores = data || [];
  }

  return <StoresList stores={stores} inactiveStores={inactiveStores} canManage={canManage} />;
}
