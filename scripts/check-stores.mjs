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

const { data: stores } = await supabase.from("stores").select("id, name, organization_id, status");
console.log("All stores:");
for (const s of stores || []) {
  console.log(`  ${s.name} (${s.id}) - org: ${s.organization_id} - ${s.status}`);
}

const { data: devices } = await supabase.from("devices").select("id, name, store_id, api_key, status");
console.log("\nAll devices:");
for (const d of devices || []) {
  console.log(`  ${d.name} (${d.id}) - store: ${d.store_id} - key: ${d.api_key} - ${d.status}`);
}

const { data: orgs } = await supabase.from("organizations").select("id, name, slug");
console.log("\nAll organizations:");
for (const o of orgs || []) {
  console.log(`  ${o.name} [${o.slug}] (${o.id})`);
}
