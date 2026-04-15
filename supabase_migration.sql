-- RetailVision Database Schema
-- Ejecutar este SQL en el SQL Editor de Supabase

-- ============================================
-- 1. ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. USER PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer',
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. STORES
-- ============================================
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  timezone TEXT DEFAULT 'America/Argentina/Cordoba',
  opening_time TIME DEFAULT '09:00',
  closing_time TIME DEFAULT '21:00',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 4. DEVICES
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  name TEXT DEFAULT 'Camera 1',
  status TEXT DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. PEOPLE COUNTS (Time-series)
-- ============================================
CREATE TABLE IF NOT EXISTS people_counts (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  entries INTEGER NOT NULL DEFAULT 0,
  exits INTEGER NOT NULL DEFAULT 0,
  current_inside INTEGER DEFAULT 0,
  period_seconds INTEGER DEFAULT 300
);

-- Índice para consultas por tienda y tiempo
CREATE INDEX IF NOT EXISTS idx_people_counts_store_time
  ON people_counts (store_id, timestamp DESC);

-- Índice para consultas por device
CREATE INDEX IF NOT EXISTS idx_people_counts_device
  ON people_counts (device_id, timestamp DESC);

-- ============================================
-- 6. ZONE HEATMAPS
-- ============================================
CREATE TABLE IF NOT EXISTS zone_heatmaps (
  id BIGSERIAL PRIMARY KEY,
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  period TEXT NOT NULL,
  heatmap_data JSONB NOT NULL,
  resolution TEXT DEFAULT '20x15',
  metadata JSONB DEFAULT '{}'
);

-- Índice para consultas por tienda, periodo y tiempo
CREATE INDEX IF NOT EXISTS idx_heatmaps_store_period
  ON zone_heatmaps (store_id, period, timestamp DESC);

-- Índice para consultas por device
CREATE INDEX IF NOT EXISTS idx_heatmaps_device
  ON zone_heatmaps (device_id, timestamp DESC);

-- ============================================
-- 7. TRANSACTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount DECIMAL(12,2),
  items_count INTEGER DEFAULT 1,
  source TEXT DEFAULT 'manual'
);

-- Índice para consultas por tienda y tiempo
CREATE INDEX IF NOT EXISTS idx_transactions_store_time
  ON transactions (store_id, timestamp DESC);

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE people_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_heatmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES - ORGANIZATIONS
-- ============================================

-- Los usuarios solo pueden ver su propia organización
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Solo admins pueden actualizar organizaciones
CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS POLICIES - USER PROFILES
-- ============================================

-- Los usuarios pueden ver profiles de su organización
CREATE POLICY "Users can view profiles in their organization"
  ON user_profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Los usuarios pueden ver su propio profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Los usuarios pueden actualizar su propio profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- ============================================
-- RLS POLICIES - STORES
-- ============================================

-- Los usuarios pueden ver stores de su organización
CREATE POLICY "Users can view stores in their organization"
  ON stores FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Los admins pueden crear stores
CREATE POLICY "Admins can insert stores"
  ON stores FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Los admins pueden actualizar stores
CREATE POLICY "Admins can update stores"
  ON stores FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Los admins pueden eliminar stores
CREATE POLICY "Admins can delete stores"
  ON stores FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- RLS POLICIES - DEVICES
-- ============================================

-- Los usuarios pueden ver devices de stores de su organización
CREATE POLICY "Users can view devices in their organization"
  ON devices FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Los admins pueden crear devices
CREATE POLICY "Admins can insert devices"
  ON devices FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    )
  );

-- Los admins pueden actualizar devices
CREATE POLICY "Admins can update devices"
  ON devices FOR UPDATE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    )
  );

-- Los admins pueden eliminar devices
CREATE POLICY "Admins can delete devices"
  ON devices FOR DELETE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- ============================================
-- RLS POLICIES - PEOPLE COUNTS
-- ============================================

-- Los usuarios pueden ver counts de su organización
CREATE POLICY "Users can view people counts in their organization"
  ON people_counts FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Los devices pueden insertar counts (via service_role o device auth)
-- Esta policy se maneja en el backend con el device API key
CREATE POLICY "Service role can insert people counts"
  ON people_counts FOR INSERT
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES - ZONE HEATMAPS
-- ============================================

-- Los usuarios pueden ver heatmaps de su organización
CREATE POLICY "Users can view heatmaps in their organization"
  ON zone_heatmaps FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Los devices pueden insertar heatmaps (via service_role)
CREATE POLICY "Service role can insert heatmaps"
  ON zone_heatmaps FOR INSERT
  WITH CHECK (true);

-- ============================================
-- RLS POLICIES - TRANSACTIONS
-- ============================================

-- Los usuarios pueden ver transactions de su organización
CREATE POLICY "Users can view transactions in their organization"
  ON transactions FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id IN (
        SELECT organization_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Los usuarios con permisos pueden insertar transactions
CREATE POLICY "Managers can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
      )
    )
  );

-- Los admins pueden eliminar transactions
CREATE POLICY "Admins can delete transactions"
  ON transactions FOR DELETE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE organization_id IN (
        SELECT organization_id FROM user_profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- ============================================
-- 9. FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at en organizations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para organizations
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para crear user_profile automáticamente al registrarse
-- Nota: Esto requiere configurar un trigger en Supabase Auth o manejarlo en el código
-- Por ahora la dejamos como placeholder para implementación futura

-- ============================================
-- 10. DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- Descomentar para crear una organización de ejemplo
/*
INSERT INTO organizations (name, slug, plan)
VALUES ('Demo Store', 'demo-store', 'trial');

-- Nota: Para crear un user_profile necesitas primero un usuario de Supabase Auth
-- Esto se hace desde la UI de autenticación
*/

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================

-- Verificar que todas las tablas se crearon correctamente
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations',
    'user_profiles',
    'stores',
    'devices',
    'people_counts',
    'zone_heatmaps',
    'transactions'
  )
ORDER BY table_name;
