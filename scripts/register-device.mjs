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

const STORE_ID = process.argv[2];
const API_KEY = process.argv[3] || "test_device_key_123";
const DEVICE_NAME = process.argv[4] || "Camara Principal";

if (!STORE_ID) {
  console.error("Usage: node scripts/register-device.mjs <store_id> [api_key] [device_name]");
  process.exit(1);
}

const { data: existing } = await supabase
  .from("devices")
  .select("id, name, api_key")
  .eq("api_key", API_KEY)
  .single();

if (existing) {
  console.log(`Device already exists: ${existing.name} (${existing.id})`);
  console.log(`API Key: ${existing.api_key}`);
  process.exit(0);
}

const { data, error } = await supabase.from("devices").insert({
  store_id: STORE_ID,
  name: DEVICE_NAME,
  api_key: API_KEY,
  status: "offline",
  config: { camera_source: "0", model: "yolov8n" },
}).select().single();

if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}

console.log("Device registered successfully!");
console.log(`  ID: ${data.id}`);
console.log(`  Name: ${data.name}`);
console.log(`  Store: ${STORE_ID}`);
console.log(`  API Key: ${data.api_key}`);
console.log(`\nSet this in edge/.env:`);
console.log(`  DEVICE_API_KEY=${data.api_key}`);
