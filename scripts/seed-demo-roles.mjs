// Crea un usuario de demostración por cada perfil del TFG en la organización de demo,
// para poder mostrar cómo cambia el sistema según el rol. Es idempotente: si el usuario
// ya existe, solo actualiza su perfil.
//
// Requiere haber ejecutado migration_roles_baja_logica.sql.
// Uso: node scripts/seed-demo-roles.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
const env = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Misma contraseña que el usuario administrador de la demo (ver README)
const PASSWORD = env.DEMO_PASSWORD || "RetailVision2026!";
const ADMIN_EMAIL = "admin@retailvision.com";

const DEMO_USERS = [
  { email: "tienda@retailvision.com", full_name: "Laura Gómez", role: "store_manager", stores: ["Sucursal Centro"] },
  { email: "categoria@retailvision.com", full_name: "Martín Ruiz", role: "category_manager" },
  { email: "director@retailvision.com", full_name: "Ana Fernández", role: "commercial_director" },
];

async function findUserByEmail(email) {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const user = data.users.find((u) => u.email === email);
    if (user || data.users.length < 200) return user || null;
  }
}

const admin = await findUserByEmail(ADMIN_EMAIL);
if (!admin) throw new Error(`No existe ${ADMIN_EMAIL}: cargá primero los datos de demo`);

const { data: adminProfile } = await supabase
  .from("user_profiles")
  .select("organization_id")
  .eq("id", admin.id)
  .single();
const orgId = adminProfile.organization_id;

const { data: stores } = await supabase.from("stores").select("id, name").eq("organization_id", orgId);

for (const demo of DEMO_USERS) {
  const storeIds = demo.stores
    ? demo.stores.map((name) => stores.find((s) => s.name === name)?.id).filter(Boolean)
    : null;

  let user = await findUserByEmail(demo.email);
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: demo.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: demo.full_name },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error } = await supabase.from("user_profiles").upsert({
    id: user.id,
    organization_id: orgId,
    role: demo.role,
    full_name: demo.full_name,
    store_ids: storeIds,
  });
  if (error) {
    throw new Error(
      `${demo.email}: ${error.message}\n¿Ejecutaste migration_roles_baja_logica.sql en Supabase?`
    );
  }

  console.log(`OK  ${demo.role.padEnd(20)} ${demo.email}${storeIds ? `  (tiendas: ${demo.stores.join(", ")})` : ""}`);
}
