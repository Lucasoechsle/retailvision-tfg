-- Fix para RLS policies con recursión infinita
-- Ejecutar este SQL en Supabase SQL Editor

-- ============================================
-- 1. DROP POLICIES EXISTENTES DE USER_PROFILES
-- ============================================

DROP POLICY IF EXISTS "Users can view profiles in their organization" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- ============================================
-- 2. SECURITY DEFINER FUNCTION PARA OBTENER ORGANIZATION_ID
-- ============================================

-- Esta función se ejecuta con privilegios del owner (bypass RLS)
-- y retorna el organization_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;

-- ============================================
-- 3. NUEVAS POLICIES PARA USER_PROFILES (SIN RECURSIÓN)
-- ============================================

-- Los usuarios pueden ver su propio perfil (usando auth.uid() directo)
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Los usuarios pueden insertar su propio perfil (para registro)
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================
-- 4. FIX POLICIES DE ORGANIZATIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;

-- Usar la función security definer para evitar recursión
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = public.get_user_organization_id());

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 5. FIX POLICIES DE STORES
-- ============================================

DROP POLICY IF EXISTS "Users can view stores in their organization" ON stores;
DROP POLICY IF EXISTS "Admins can insert stores" ON stores;
DROP POLICY IF EXISTS "Admins can update stores" ON stores;
DROP POLICY IF EXISTS "Admins can delete stores" ON stores;

CREATE POLICY "Users can view stores in their organization"
  ON stores FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can insert stores"
  ON stores FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update stores"
  ON stores FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete stores"
  ON stores FOR DELETE
  USING (
    organization_id = public.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 6. FIX POLICIES DE DEVICES
-- ============================================

DROP POLICY IF EXISTS "Users can view devices in their organization" ON devices;
DROP POLICY IF EXISTS "Admins can insert devices" ON devices;
DROP POLICY IF EXISTS "Admins can update devices" ON devices;
DROP POLICY IF EXISTS "Admins can delete devices" ON devices;

CREATE POLICY "Users can view devices in their organization"
  ON devices FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "Admins can insert devices"
  ON devices FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE organization_id = public.get_user_organization_id()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can update devices"
  ON devices FOR UPDATE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id = public.get_user_organization_id()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete devices"
  ON devices FOR DELETE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id = public.get_user_organization_id()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 7. FIX POLICIES DE PEOPLE_COUNTS
-- ============================================

DROP POLICY IF EXISTS "Users can view people counts in their organization" ON people_counts;
DROP POLICY IF EXISTS "Service role can insert people counts" ON people_counts;

CREATE POLICY "Users can view people counts in their organization"
  ON people_counts FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id = public.get_user_organization_id()
    )
  );

-- Para ingesta de devices (sin autenticación de usuario)
CREATE POLICY "Service role can insert people counts"
  ON people_counts FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 8. FIX POLICIES DE ZONE_HEATMAPS
-- ============================================

DROP POLICY IF EXISTS "Users can view heatmaps in their organization" ON zone_heatmaps;
DROP POLICY IF EXISTS "Service role can insert heatmaps" ON zone_heatmaps;

CREATE POLICY "Users can view heatmaps in their organization"
  ON zone_heatmaps FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "Service role can insert heatmaps"
  ON zone_heatmaps FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 9. FIX POLICIES DE TRANSACTIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view transactions in their organization" ON transactions;
DROP POLICY IF EXISTS "Managers can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON transactions;

CREATE POLICY "Users can view transactions in their organization"
  ON transactions FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "Managers can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE organization_id = public.get_user_organization_id()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can delete transactions"
  ON transactions FOR DELETE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id = public.get_user_organization_id()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 10. VERIFICACIÓN
-- ============================================

-- Verificar que las policies se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar la función
SELECT routine_name, routine_type, security_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'get_user_organization_id';

-- ============================================
-- FIN
-- ============================================
