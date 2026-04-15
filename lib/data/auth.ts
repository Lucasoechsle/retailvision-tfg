import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types";

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*, organizations(*)")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function getUserOrgId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return profile?.organization_id || null;
}
