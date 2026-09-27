-- ============================================================================
-- RetailVision — Perfiles de usuario y baja lógica de sucursales
-- ----------------------------------------------------------------------------
-- 1. Reemplaza los roles genéricos (admin / manager / analyst / viewer) por los
--    cuatro perfiles del TFG: owner (Administrador), store_manager (Gerente de
--    tienda), category_manager (Gerente de categoría) y commercial_director
--    (Director comercial).
-- 2. Agrega user_profiles.store_ids: sucursales a cargo del gerente de tienda.
-- 3. Actualiza las políticas RLS que dependían del rol.
-- 4. HU-04: elimina la política de DELETE sobre stores. La baja de una sucursal
--    es lógica (is_active = false) y conserva todo su histórico; un DELETE físico
--    borraba en cascada conteos, recorridos, transacciones, etc.
--
-- Se ejecuta DESPUÉS de supabase_schema_completo.sql. Es idempotente.
-- ============================================================================

-- 1. Roles ------------------------------------------------------------------

-- Quitar cualquier CHECK previo sobre el rol antes de migrar los valores
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.user_profiles DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

UPDATE user_profiles SET role = CASE role
  WHEN 'admin'   THEN 'owner'
  WHEN 'manager' THEN 'store_manager'
  WHEN 'analyst' THEN 'category_manager'
  WHEN 'viewer'  THEN 'commercial_director'
  ELSE coalesce(role, 'commercial_director')
END;

ALTER TABLE user_profiles ALTER COLUMN role SET DEFAULT 'commercial_director';
ALTER TABLE user_profiles ALTER COLUMN role SET NOT NULL;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('owner', 'store_manager', 'category_manager', 'commercial_director'));

-- 2. Sucursales a cargo del gerente de tienda (NULL = todas) ------------------

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS store_ids UUID[];

-- 3. Políticas RLS por rol --------------------------------------------------

-- Rol del usuario autenticado (SECURITY DEFINER evita la recursión de RLS sobre user_profiles)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Organizations
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;
DROP POLICY IF EXISTS "Owner can update the organization" ON organizations;
CREATE POLICY "Owner can update the organization"
  ON organizations FOR UPDATE
  USING (id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

-- Stores (HU-04)
DROP POLICY IF EXISTS "Admins can insert stores" ON stores;
DROP POLICY IF EXISTS "Admins can update stores" ON stores;
DROP POLICY IF EXISTS "Admins can delete stores" ON stores;
DROP POLICY IF EXISTS "Owner can insert stores" ON stores;
DROP POLICY IF EXISTS "Owner can update stores" ON stores;

CREATE POLICY "Owner can insert stores"
  ON stores FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

CREATE POLICY "Owner can update stores"
  ON stores FOR UPDATE
  USING (organization_id = public.get_user_organization_id() AND public.get_user_role() = 'owner');

-- Sin política de DELETE: ninguna sesión de usuario puede borrar físicamente una sucursal.

-- Devices (HU-05)
DROP POLICY IF EXISTS "Admins can insert devices" ON devices;
DROP POLICY IF EXISTS "Admins can update devices" ON devices;
DROP POLICY IF EXISTS "Admins can delete devices" ON devices;
DROP POLICY IF EXISTS "Owner can insert devices" ON devices;
DROP POLICY IF EXISTS "Owner can update devices" ON devices;
DROP POLICY IF EXISTS "Owner can delete devices" ON devices;

CREATE POLICY "Owner can insert devices"
  ON devices FOR INSERT
  WITH CHECK (
    store_id IN (SELECT id FROM stores WHERE organization_id = public.get_user_organization_id())
    AND public.get_user_role() = 'owner'
  );

CREATE POLICY "Owner can update devices"
  ON devices FOR UPDATE
  USING (
    store_id IN (SELECT id FROM stores WHERE organization_id = public.get_user_organization_id())
    AND public.get_user_role() = 'owner'
  );

CREATE POLICY "Owner can delete devices"
  ON devices FOR DELETE
  USING (
    store_id IN (SELECT id FROM stores WHERE organization_id = public.get_user_organization_id())
    AND public.get_user_role() = 'owner'
  );

-- Transactions (HU-19)
DROP POLICY IF EXISTS "Managers can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can delete transactions" ON transactions;
DROP POLICY IF EXISTS "Owner and category managers can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Owner can delete transactions" ON transactions;

CREATE POLICY "Owner and category managers can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    store_id IN (SELECT id FROM stores WHERE organization_id = public.get_user_organization_id())
    AND public.get_user_role() IN ('owner', 'category_manager')
  );

CREATE POLICY "Owner can delete transactions"
  ON transactions FOR DELETE
  USING (
    store_id IN (SELECT id FROM stores WHERE organization_id = public.get_user_organization_id())
    AND public.get_user_role() = 'owner'
  );

-- 4. Verificación -----------------------------------------------------------
-- Debe listar los perfiles con los nuevos roles y 0 políticas con roles viejos.
SELECT
  (SELECT string_agg(role || ': ' || n, ', ')
     FROM (SELECT role, count(*) AS n FROM user_profiles GROUP BY role) r) AS perfiles,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') ~ '''(admin|manager|analyst|viewer)'''
        OR coalesce(with_check, '') ~ '''(admin|manager|analyst|viewer)''')) AS politicas_con_roles_viejos,
  (SELECT count(*) FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'stores' AND cmd = 'DELETE') AS politicas_delete_stores;
