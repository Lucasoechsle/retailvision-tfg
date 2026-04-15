import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
const env = Object.fromEntries(
  envFile.split("\n").filter(l => l && !l.startsWith("#")).map(l => l.split("=").map(s => s.trim()))
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: allStores, error: storeErr } = await supabase
  .from("stores")
  .select("id, name, organization_id");

console.log("All stores:", allStores, storeErr?.message || "");

// Find stores for "Supermercado Demo" org
const demoOrgId = "66e526d2-6316-49c8-8c51-1c62cf8d0074";
const { data: demoStores } = await supabase
  .from("stores")
  .select("id, name")
  .eq("organization_id", demoOrgId);

console.log("\nStores for Supermercado Demo:", demoStores);

if (demoStores && demoStores.length > 0) {
  const targetStore = demoStores[0];
  console.log(`\nMoving device to store: ${targetStore.name} (${targetStore.id})`);

  const { error } = await supabase
    .from("devices")
    .update({ store_id: targetStore.id })
    .eq("api_key", "test_device_key_123");

  if (error) {
    console.error("Error moving device:", error.message);
  } else {
    console.log("Device moved successfully!");
  }

  // Also move existing people_counts
  const { error: countErr, count } = await supabase
    .from("people_counts")
    .update({ store_id: targetStore.id })
    .eq("store_id", "4e29d92a-901f-40ff-9c8e-ffe2ac601dde")
    .select("*", { count: "exact", head: true });

  console.log(`Moved ${count || 0} existing count records`, countErr?.message || "");
} else {
  console.log("No stores found for demo org. The store might have RLS blocking service role.");
  console.log("Let's check user_profiles to find the right org...");

  const { data: profiles } = await supabase.from("user_profiles").select("*");
  console.log("Profiles:", profiles);
}
