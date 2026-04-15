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

const OLD_STORE = "4e29d92a-901f-40ff-9c8e-ffe2ac601dde";
const NEW_STORE = "36cbec1a-11f5-4801-bdaf-d1474e039d5a";

const { data, error } = await supabase
  .from("people_counts")
  .update({ store_id: NEW_STORE })
  .eq("store_id", OLD_STORE)
  .select("id");

console.log(`Moved ${data?.length || 0} count records`, error?.message || "");

// Verify
const { data: counts } = await supabase
  .from("people_counts")
  .select("*")
  .eq("store_id", NEW_STORE)
  .order("timestamp", { ascending: false })
  .limit(5);

console.log("\nLatest counts for Sucursal Centro:");
for (const c of counts || []) {
  console.log(`  ${c.timestamp} | entries: ${c.entries}, exits: ${c.exits}, inside: ${c.current_inside}`);
}
