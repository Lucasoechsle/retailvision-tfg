-- Fix simple para permitir registro sin service role key
-- Ejecutar en Supabase SQL Editor

-- 1. Permitir a usuarios autenticados crear organizaciones
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (true);

-- 2. Verificar que user_profiles permite INSERT
-- (ya debería estar creado desde supabase_rls_fix.sql)
-- Si no existe, crearlo:
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());
