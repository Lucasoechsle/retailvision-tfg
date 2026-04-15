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

const { data: device } = await supabase
  .from("devices")
  .select("*, stores(id, name)")
  .eq("api_key", "test_device_key_123")
  .single();

if (!device) {
  console.log("No device found");
  process.exit(1);
}

console.log("Device:", device.name);
console.log("  ID:", device.id);
console.log("  Store:", device.stores?.name, `(${device.store_id})`);
console.log("  Status:", device.status);
console.log("  Last seen:", device.last_seen_at);

const { data: counts } = await supabase
  .from("people_counts")
  .select("*")
  .eq("device_id", device.id)
  .order("timestamp", { ascending: false })
  .limit(5);

console.log("\nLatest people_counts:", counts?.length || 0, "records");
if (counts && counts.length > 0) {
  for (const c of counts) {
    console.log(`  ${c.timestamp} | entries: ${c.entries}, exits: ${c.exits}, inside: ${c.current_inside}`);
  }
}

const { count } = await supabase
  .from("people_counts")
  .select("*", { count: "exact", head: true })
  .eq("store_id", device.store_id);

console.log(`\nTotal records in DB for this store: ${count}`);
