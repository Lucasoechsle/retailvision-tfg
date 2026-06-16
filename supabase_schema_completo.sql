-- ============================================================
-- RetailVision — Setup completo de base de datos nueva
-- Pegar TODO este archivo en: Supabase Dashboard > SQL Editor > New query > Run
-- Crea las 22 tablas + RLS + funciones RPC en el orden correcto.
-- ============================================================


-- ============================================================
-- BLOQUE: supabase_migration.sql
-- ============================================================

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


-- ============================================================
-- BLOQUE: supabase_enterprise_migration.sql
-- ============================================================

-- ============================================
-- RetailVision Enterprise Schema Migration
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FLOOR PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS floor_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT DEFAULT 'Plano Principal',
  image_url TEXT,
  width_px INT,
  height_px INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_floor_plans_store
  ON floor_plans (store_id);

-- ============================================
-- 2. ZONES
-- ============================================
CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  zone_type TEXT DEFAULT 'aisle'
    CHECK (zone_type IN ('aisle', 'checkout', 'entrance', 'promo', 'endcap', 'storage', 'other')),
  polygon JSONB NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  floor_plan_id UUID REFERENCES floor_plans(id) ON DELETE SET NULL,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zones_store
  ON zones (store_id, is_active);

-- ============================================
-- 3. DEVICE ZONES (camera-to-zone mapping)
-- ============================================
CREATE TABLE IF NOT EXISTS device_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  camera_polygon JSONB,
  calibration_data JSONB DEFAULT '{}',
  UNIQUE(device_id, zone_id)
);

-- ============================================
-- 4. ZONE TRAFFIC (time-series per zone)
-- ============================================
CREATE TABLE IF NOT EXISTS zone_traffic (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_seconds INT DEFAULT 300,
  entries INT DEFAULT 0,
  exits INT DEFAULT 0,
  avg_occupancy FLOAT DEFAULT 0,
  peak_occupancy INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_zone_traffic_zone_time
  ON zone_traffic (zone_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_zone_traffic_store_time
  ON zone_traffic (store_id, timestamp DESC);

-- ============================================
-- 5. DWELL EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS dwell_events (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  track_id INT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL,
  exited_at TIMESTAMPTZ,
  dwell_seconds FLOAT,
  engagement_type TEXT DEFAULT 'pass'
    CHECK (engagement_type IN ('pass', 'browse', 'engaged'))
);

CREATE INDEX IF NOT EXISTS idx_dwell_events_zone_time
  ON dwell_events (zone_id, entered_at DESC);

CREATE INDEX IF NOT EXISTS idx_dwell_events_store_time
  ON dwell_events (store_id, entered_at DESC);

-- ============================================
-- 6. DAILY STORE SUMMARIES
-- ============================================
CREATE TABLE IF NOT EXISTS daily_store_summaries (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_visitors INT DEFAULT 0,
  peak_hour INT,
  peak_occupancy INT DEFAULT 0,
  avg_dwell_seconds FLOAT,
  total_transactions INT DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  conversion_rate FLOAT,
  UNIQUE(store_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_store_summaries_store_date
  ON daily_store_summaries (store_id, date DESC);

-- ============================================
-- 7. DAILY ZONE SUMMARIES
-- ============================================
CREATE TABLE IF NOT EXISTS daily_zone_summaries (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  total_visits INT DEFAULT 0,
  avg_dwell_seconds FLOAT,
  engagement_rate FLOAT,
  peak_hour INT,
  UNIQUE(zone_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_zone_summaries_zone_date
  ON daily_zone_summaries (zone_id, date DESC);

-- ============================================
-- 8. ALERT RULES
-- ============================================
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL
    CHECK (rule_type IN ('queue_length', 'occupancy', 'zone_empty', 'device_offline', 'traffic_anomaly')),
  config JSONB NOT NULL DEFAULT '{}',
  notify_channels TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_store
  ON alert_rules (store_id, is_active);

-- ============================================
-- 9. ALERT EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS alert_events (
  id BIGSERIAL PRIMARY KEY,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  data JSONB,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'acknowledged', 'resolved'))
);

CREATE INDEX IF NOT EXISTS idx_alert_events_store_status
  ON alert_events (store_id, status, triggered_at DESC);

-- ============================================
-- 10. ADD status='error' TO devices
-- ============================================
ALTER TABLE devices
  DROP CONSTRAINT IF EXISTS devices_status_check;

ALTER TABLE devices
  ADD CONSTRAINT devices_status_check
  CHECK (status IN ('online', 'offline', 'error'));

-- ============================================
-- 11. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_traffic ENABLE ROW LEVEL SECURITY;
ALTER TABLE dwell_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_store_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_zone_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's org_id
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get store_ids for current user's org
CREATE OR REPLACE FUNCTION get_user_store_ids()
RETURNS SETOF UUID AS $$
  SELECT id FROM stores WHERE organization_id = get_user_org_id()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- FLOOR PLANS
CREATE POLICY "Users view floor plans in their org"
  ON floor_plans FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Managers manage floor plans"
  ON floor_plans FOR ALL
  USING (store_id IN (SELECT get_user_store_ids()));

-- ZONES
CREATE POLICY "Users view zones in their org"
  ON zones FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Managers manage zones"
  ON zones FOR ALL
  USING (store_id IN (SELECT get_user_store_ids()));

-- DEVICE ZONES
CREATE POLICY "Users view device zones in their org"
  ON device_zones FOR SELECT
  USING (
    device_id IN (
      SELECT id FROM devices WHERE store_id IN (SELECT get_user_store_ids())
    )
  );

CREATE POLICY "Managers manage device zones"
  ON device_zones FOR ALL
  USING (
    device_id IN (
      SELECT id FROM devices WHERE store_id IN (SELECT get_user_store_ids())
    )
  );

-- ZONE TRAFFIC
CREATE POLICY "Users view zone traffic in their org"
  ON zone_traffic FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Service role inserts zone traffic"
  ON zone_traffic FOR INSERT
  WITH CHECK (true);

-- DWELL EVENTS
CREATE POLICY "Users view dwell events in their org"
  ON dwell_events FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Service role inserts dwell events"
  ON dwell_events FOR INSERT
  WITH CHECK (true);

-- DAILY STORE SUMMARIES
CREATE POLICY "Users view daily store summaries in their org"
  ON daily_store_summaries FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Service role manages daily store summaries"
  ON daily_store_summaries FOR ALL
  WITH CHECK (true);

-- DAILY ZONE SUMMARIES
CREATE POLICY "Users view daily zone summaries in their org"
  ON daily_zone_summaries FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Service role manages daily zone summaries"
  ON daily_zone_summaries FOR ALL
  WITH CHECK (true);

-- ALERT RULES
CREATE POLICY "Users view alert rules in their org"
  ON alert_rules FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Managers manage alert rules"
  ON alert_rules FOR ALL
  USING (store_id IN (SELECT get_user_store_ids()));

-- ALERT EVENTS
CREATE POLICY "Users view alert events in their org"
  ON alert_events FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Service role manages alert events"
  ON alert_events FOR ALL
  WITH CHECK (true);

-- ============================================
-- 12. AGGREGATION FUNCTIONS
-- ============================================

-- Get hourly traffic for a store over the last N days
CREATE OR REPLACE FUNCTION get_hourly_traffic(
  p_store_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE(
  hour INT,
  avg_entries FLOAT,
  avg_exits FLOAT,
  avg_inside FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM pc.timestamp)::INT AS hour,
    AVG(pc.entries)::FLOAT AS avg_entries,
    AVG(pc.exits)::FLOAT AS avg_exits,
    AVG(pc.current_inside)::FLOAT AS avg_inside
  FROM people_counts pc
  WHERE pc.store_id = p_store_id
    AND pc.timestamp >= now() - (p_days || ' days')::INTERVAL
  GROUP BY EXTRACT(HOUR FROM pc.timestamp)
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get zone rankings for a store in a date range
CREATE OR REPLACE FUNCTION get_zone_rankings(
  p_store_id UUID,
  p_date_from DATE DEFAULT CURRENT_DATE - 7,
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  zone_id UUID,
  zone_name TEXT,
  zone_type TEXT,
  zone_color TEXT,
  total_visits BIGINT,
  avg_dwell FLOAT,
  engagement_rate FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    z.id AS zone_id,
    z.name AS zone_name,
    z.zone_type,
    z.color AS zone_color,
    COALESCE(SUM(dzs.total_visits), 0)::BIGINT AS total_visits,
    AVG(dzs.avg_dwell_seconds)::FLOAT AS avg_dwell,
    AVG(dzs.engagement_rate)::FLOAT AS engagement_rate
  FROM zones z
  LEFT JOIN daily_zone_summaries dzs
    ON dzs.zone_id = z.id
    AND dzs.date BETWEEN p_date_from AND p_date_to
  WHERE z.store_id = p_store_id
    AND z.is_active = true
  GROUP BY z.id, z.name, z.zone_type, z.color
  ORDER BY total_visits DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate daily store summary for a given date
CREATE OR REPLACE FUNCTION generate_daily_store_summary(
  p_store_id UUID,
  p_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS VOID AS $$
DECLARE
  v_total_visitors INT;
  v_peak_hour INT;
  v_peak_occupancy INT;
  v_avg_dwell FLOAT;
  v_total_transactions INT;
  v_total_revenue DECIMAL;
  v_conversion_rate FLOAT;
BEGIN
  SELECT
    COALESCE(SUM(entries), 0),
    (SELECT EXTRACT(HOUR FROM timestamp)::INT
     FROM people_counts
     WHERE store_id = p_store_id
       AND timestamp::DATE = p_date
     GROUP BY EXTRACT(HOUR FROM timestamp)
     ORDER BY SUM(entries) DESC
     LIMIT 1),
    COALESCE(MAX(current_inside), 0)
  INTO v_total_visitors, v_peak_hour, v_peak_occupancy
  FROM people_counts
  WHERE store_id = p_store_id
    AND timestamp::DATE = p_date;

  SELECT AVG(dwell_seconds)
  INTO v_avg_dwell
  FROM dwell_events
  WHERE store_id = p_store_id
    AND entered_at::DATE = p_date
    AND dwell_seconds IS NOT NULL;

  SELECT COUNT(*), COALESCE(SUM(amount), 0)
  INTO v_total_transactions, v_total_revenue
  FROM transactions
  WHERE store_id = p_store_id
    AND timestamp::DATE = p_date;

  IF v_total_visitors > 0 AND v_total_transactions > 0 THEN
    v_conversion_rate := v_total_transactions::FLOAT / v_total_visitors * 100;
  END IF;

  INSERT INTO daily_store_summaries (
    store_id, date, total_visitors, peak_hour, peak_occupancy,
    avg_dwell_seconds, total_transactions, total_revenue, conversion_rate
  ) VALUES (
    p_store_id, p_date, v_total_visitors, v_peak_hour, v_peak_occupancy,
    v_avg_dwell, v_total_transactions, v_total_revenue, v_conversion_rate
  )
  ON CONFLICT (store_id, date) DO UPDATE SET
    total_visitors = EXCLUDED.total_visitors,
    peak_hour = EXCLUDED.peak_hour,
    peak_occupancy = EXCLUDED.peak_occupancy,
    avg_dwell_seconds = EXCLUDED.avg_dwell_seconds,
    total_transactions = EXCLUDED.total_transactions,
    total_revenue = EXCLUDED.total_revenue,
    conversion_rate = EXCLUDED.conversion_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate daily zone summary
CREATE OR REPLACE FUNCTION generate_daily_zone_summary(
  p_zone_id UUID,
  p_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS VOID AS $$
DECLARE
  v_store_id UUID;
  v_total_visits INT;
  v_avg_dwell FLOAT;
  v_engagement_rate FLOAT;
  v_peak_hour INT;
BEGIN
  SELECT store_id INTO v_store_id FROM zones WHERE id = p_zone_id;

  SELECT COALESCE(SUM(entries), 0)
  INTO v_total_visits
  FROM zone_traffic
  WHERE zone_id = p_zone_id
    AND timestamp::DATE = p_date;

  SELECT
    AVG(dwell_seconds),
    CASE WHEN COUNT(*) > 0
      THEN COUNT(*) FILTER (WHERE engagement_type IN ('browse', 'engaged'))::FLOAT / COUNT(*) * 100
      ELSE NULL
    END
  INTO v_avg_dwell, v_engagement_rate
  FROM dwell_events
  WHERE zone_id = p_zone_id
    AND entered_at::DATE = p_date
    AND dwell_seconds IS NOT NULL;

  SELECT EXTRACT(HOUR FROM timestamp)::INT
  INTO v_peak_hour
  FROM zone_traffic
  WHERE zone_id = p_zone_id
    AND timestamp::DATE = p_date
  GROUP BY EXTRACT(HOUR FROM timestamp)
  ORDER BY SUM(entries) DESC
  LIMIT 1;

  INSERT INTO daily_zone_summaries (
    zone_id, store_id, date, total_visits, avg_dwell_seconds, engagement_rate, peak_hour
  ) VALUES (
    p_zone_id, v_store_id, p_date, v_total_visits, v_avg_dwell, v_engagement_rate, v_peak_hour
  )
  ON CONFLICT (zone_id, date) DO UPDATE SET
    total_visits = EXCLUDED.total_visits,
    avg_dwell_seconds = EXCLUDED.avg_dwell_seconds,
    engagement_rate = EXCLUDED.engagement_rate,
    peak_hour = EXCLUDED.peak_hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compare two periods for a store
CREATE OR REPLACE FUNCTION compare_periods(
  p_store_id UUID,
  p_current_start DATE,
  p_current_end DATE,
  p_previous_start DATE,
  p_previous_end DATE
)
RETURNS TABLE(
  metric TEXT,
  current_value FLOAT,
  previous_value FLOAT,
  change_pct FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT
      COALESCE(SUM(total_visitors), 0)::FLOAT AS visitors,
      AVG(avg_dwell_seconds)::FLOAT AS dwell,
      AVG(conversion_rate)::FLOAT AS conversion,
      COALESCE(SUM(total_revenue), 0)::FLOAT AS revenue
    FROM daily_store_summaries
    WHERE store_id = p_store_id
      AND date BETWEEN p_current_start AND p_current_end
  ),
  previous_period AS (
    SELECT
      COALESCE(SUM(total_visitors), 0)::FLOAT AS visitors,
      AVG(avg_dwell_seconds)::FLOAT AS dwell,
      AVG(conversion_rate)::FLOAT AS conversion,
      COALESCE(SUM(total_revenue), 0)::FLOAT AS revenue
    FROM daily_store_summaries
    WHERE store_id = p_store_id
      AND date BETWEEN p_previous_start AND p_previous_end
  )
  SELECT 'visitors'::TEXT, c.visitors, p.visitors,
    CASE WHEN p.visitors > 0 THEN ((c.visitors - p.visitors) / p.visitors * 100) ELSE NULL END
  FROM current_period c, previous_period p
  UNION ALL
  SELECT 'dwell_seconds'::TEXT, c.dwell, p.dwell,
    CASE WHEN p.dwell > 0 THEN ((c.dwell - p.dwell) / p.dwell * 100) ELSE NULL END
  FROM current_period c, previous_period p
  UNION ALL
  SELECT 'conversion_rate'::TEXT, c.conversion, p.conversion,
    CASE WHEN p.conversion > 0 THEN ((c.conversion - p.conversion) / p.conversion * 100) ELSE NULL END
  FROM current_period c, previous_period p
  UNION ALL
  SELECT 'revenue'::TEXT, c.revenue, p.revenue,
    CASE WHEN p.revenue > 0 THEN ((c.revenue - p.revenue) / p.revenue * 100) ELSE NULL END
  FROM current_period c, previous_period p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. VERIFY TABLES
-- ============================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'organizations', 'user_profiles', 'stores', 'devices',
    'people_counts', 'zone_heatmaps', 'transactions',
    'floor_plans', 'zones', 'device_zones', 'zone_traffic',
    'dwell_events', 'daily_store_summaries', 'daily_zone_summaries',
    'alert_rules', 'alert_events'
  )
ORDER BY table_name;


-- ============================================================
-- BLOQUE: migration_journeys_queues.sql
-- ============================================================

-- ============================================
-- RetailVision: Customer Journeys + Queue Snapshots
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CUSTOMER JOURNEYS
-- ============================================
CREATE TABLE IF NOT EXISTS customer_journeys (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  track_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  total_zones_visited INT NOT NULL DEFAULT 0,
  total_dwell_seconds REAL NOT NULL DEFAULT 0,
  journey_data JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_journeys_store_time
  ON customer_journeys (store_id, started_at DESC);

-- Nota: no se usa índice funcional sobre started_at::date porque
-- TIMESTAMPTZ::date no es IMMUTABLE. El índice idx_customer_journeys_store_time
-- (store_id, started_at DESC) cubre las queries principales.

-- ============================================
-- 2. ZONE TRANSITIONS (aggregated flows)
-- ============================================
CREATE TABLE IF NOT EXISTS zone_transitions (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  from_zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  to_zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  transition_count INT NOT NULL DEFAULT 1,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_zone_transitions_store_time
  ON zone_transitions (store_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_zone_transitions_flow
  ON zone_transitions (store_id, from_zone_id, to_zone_id);

-- ============================================
-- 3. QUEUE SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS queue_snapshots (
  id BIGSERIAL PRIMARY KEY,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  people_in_queue INT NOT NULL DEFAULT 0,
  estimated_wait_seconds REAL NOT NULL DEFAULT 0,
  peak_in_period INT DEFAULT 0,
  avg_in_period REAL DEFAULT 0,
  is_open BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_queue_snapshots_store_time
  ON queue_snapshots (store_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_queue_snapshots_zone
  ON queue_snapshots (zone_id, timestamp DESC);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

ALTER TABLE customer_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_snapshots ENABLE ROW LEVEL SECURITY;

-- CUSTOMER JOURNEYS
CREATE POLICY "Users view journeys in their org"
  ON customer_journeys FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Service role inserts journeys"
  ON customer_journeys FOR INSERT
  WITH CHECK (true);

-- ZONE TRANSITIONS
CREATE POLICY "Users view transitions in their org"
  ON zone_transitions FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Service role inserts transitions"
  ON zone_transitions FOR INSERT
  WITH CHECK (true);

-- QUEUE SNAPSHOTS
CREATE POLICY "Users view queue snapshots in their org"
  ON queue_snapshots FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Service role inserts queue snapshots"
  ON queue_snapshots FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Top journey patterns for a store in a date range
CREATE OR REPLACE FUNCTION get_journey_patterns(
  p_store_id UUID,
  p_start DATE DEFAULT CURRENT_DATE,
  p_end DATE DEFAULT CURRENT_DATE,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  pattern TEXT,
  frequency BIGINT,
  avg_dwell REAL,
  avg_zones INT
) AS $$
  SELECT
    array_to_string(
      ARRAY(
        SELECT elem->>'zone_id'
        FROM jsonb_array_elements(journey_data) AS elem
      ),
      ' → '
    ) AS pattern,
    COUNT(*) AS frequency,
    AVG(total_dwell_seconds)::REAL AS avg_dwell,
    AVG(total_zones_visited)::INT AS avg_zones
  FROM customer_journeys
  WHERE store_id = p_store_id
    AND started_at::date BETWEEN p_start AND p_end
  GROUP BY pattern
  ORDER BY frequency DESC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Aggregated zone-to-zone flow for a store in a date range
CREATE OR REPLACE FUNCTION get_zone_flow(
  p_store_id UUID,
  p_start DATE DEFAULT CURRENT_DATE,
  p_end DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  from_zone_id UUID,
  to_zone_id UUID,
  total_transitions BIGINT
) AS $$
  SELECT
    from_zone_id,
    to_zone_id,
    SUM(transition_count) AS total_transitions
  FROM zone_transitions
  WHERE store_id = p_store_id
    AND timestamp::date BETWEEN p_start AND p_end
  GROUP BY from_zone_id, to_zone_id
  ORDER BY total_transitions DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Hourly queue history for a store
CREATE OR REPLACE FUNCTION get_queue_history(
  p_store_id UUID,
  p_start TIMESTAMPTZ DEFAULT CURRENT_DATE::TIMESTAMPTZ,
  p_end TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  hour TIMESTAMPTZ,
  zone_id UUID,
  avg_people REAL,
  max_people INT,
  avg_wait REAL
) AS $$
  SELECT
    date_trunc('hour', timestamp) AS hour,
    zone_id,
    AVG(people_in_queue)::REAL AS avg_people,
    MAX(people_in_queue) AS max_people,
    AVG(estimated_wait_seconds)::REAL AS avg_wait
  FROM queue_snapshots
  WHERE store_id = p_store_id
    AND timestamp BETWEEN p_start AND p_end
  GROUP BY hour, zone_id
  ORDER BY hour;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- BLOQUE: migration_campaigns.sql
-- ============================================================

-- ============================================
-- RetailVision: Campaigns (Efectividad Promocional)
-- Ejecutar en Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT DEFAULT 'promo'
    CHECK (campaign_type IN ('promo', 'endcap', 'island', 'seasonal', 'layout_change', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  baseline_start DATE NOT NULL,
  baseline_end DATE NOT NULL,
  status TEXT DEFAULT 'planned'
    CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_store
  ON campaigns (store_id, status);

CREATE INDEX IF NOT EXISTS idx_campaigns_dates
  ON campaigns (store_id, start_date, end_date);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view campaigns in their org"
  ON campaigns FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Managers manage campaigns"
  ON campaigns FOR ALL
  USING (store_id IN (SELECT get_user_store_ids()));

-- Function to compare campaign metrics vs baseline
CREATE OR REPLACE FUNCTION get_campaign_metrics(
  p_campaign_id UUID
)
RETURNS TABLE (
  period TEXT,
  total_visitors BIGINT,
  avg_daily_visitors REAL,
  total_zone_visits BIGINT,
  avg_dwell_seconds REAL,
  avg_engagement_rate REAL,
  total_transactions BIGINT,
  conversion_rate REAL
) AS $$
DECLARE
  v_store_id UUID;
  v_zone_id UUID;
  v_start DATE;
  v_end DATE;
  v_baseline_start DATE;
  v_baseline_end DATE;
BEGIN
  SELECT c.store_id, c.zone_id, c.start_date, c.end_date, c.baseline_start, c.baseline_end
  INTO v_store_id, v_zone_id, v_start, v_end, v_baseline_start, v_baseline_end
  FROM campaigns c
  WHERE c.id = p_campaign_id;

  -- Baseline period
  RETURN QUERY
  SELECT
    'baseline'::TEXT AS period,
    COALESCE(SUM(dss.total_visitors), 0)::BIGINT,
    (COALESCE(SUM(dss.total_visitors), 0)::REAL / GREATEST(v_baseline_end - v_baseline_start + 1, 1)),
    COALESCE(SUM(dzs.total_visits), 0)::BIGINT,
    COALESCE(AVG(dzs.avg_dwell_seconds), 0)::REAL,
    COALESCE(AVG(dzs.engagement_rate), 0)::REAL,
    COALESCE(SUM(dss.total_transactions), 0)::BIGINT,
    COALESCE(AVG(dss.conversion_rate), 0)::REAL
  FROM daily_store_summaries dss
  LEFT JOIN daily_zone_summaries dzs
    ON dzs.store_id = v_store_id
    AND dzs.zone_id = v_zone_id
    AND dzs.date = dss.date
  WHERE dss.store_id = v_store_id
    AND dss.date BETWEEN v_baseline_start AND v_baseline_end;

  -- Campaign period
  RETURN QUERY
  SELECT
    'campaign'::TEXT AS period,
    COALESCE(SUM(dss.total_visitors), 0)::BIGINT,
    (COALESCE(SUM(dss.total_visitors), 0)::REAL / GREATEST(v_end - v_start + 1, 1)),
    COALESCE(SUM(dzs.total_visits), 0)::BIGINT,
    COALESCE(AVG(dzs.avg_dwell_seconds), 0)::REAL,
    COALESCE(AVG(dzs.engagement_rate), 0)::REAL,
    COALESCE(SUM(dss.total_transactions), 0)::BIGINT,
    COALESCE(AVG(dss.conversion_rate), 0)::REAL
  FROM daily_store_summaries dss
  LEFT JOIN daily_zone_summaries dzs
    ON dzs.store_id = v_store_id
    AND dzs.zone_id = v_zone_id
    AND dzs.date = dss.date
  WHERE dss.store_id = v_store_id
    AND dss.date BETWEEN v_start AND v_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ============================================================
-- BLOQUE: migration_advanced_analytics.sql
-- ============================================================

-- ============================================
-- RetailVision: Advanced Analytics
-- Shelf Grids + Shelf Heatmaps + Temporal Functions
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Add 'gondola' to zones zone_type CHECK
ALTER TABLE zones DROP CONSTRAINT IF EXISTS zones_zone_type_check;
ALTER TABLE zones ADD CONSTRAINT zones_zone_type_check
  CHECK (zone_type IN ('aisle', 'checkout', 'entrance', 'promo', 'endcap', 'storage', 'gondola', 'other'));

-- 2. SHELF GRIDS
CREATE TABLE IF NOT EXISTS shelf_grids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL UNIQUE,
  rows INT NOT NULL DEFAULT 4,
  cols INT NOT NULL DEFAULT 6,
  cell_labels JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shelf_grids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view shelf grids in their org"
  ON shelf_grids FOR SELECT
  USING (zone_id IN (SELECT id FROM zones WHERE store_id IN (SELECT get_user_store_ids())));

CREATE POLICY "Managers manage shelf grids"
  ON shelf_grids FOR ALL
  USING (zone_id IN (SELECT id FROM zones WHERE store_id IN (SELECT get_user_store_ids())));

-- 3. SHELF HEATMAPS
CREATE TABLE IF NOT EXISTS shelf_heatmaps (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  grid_data JSONB NOT NULL DEFAULT '[]',
  resolution TEXT NOT NULL DEFAULT '6x4',
  period_seconds INT DEFAULT 300
);

CREATE INDEX IF NOT EXISTS idx_shelf_heatmaps_zone_time
  ON shelf_heatmaps (zone_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_shelf_heatmaps_store_time
  ON shelf_heatmaps (store_id, timestamp DESC);

ALTER TABLE shelf_heatmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view shelf heatmaps in their org"
  ON shelf_heatmaps FOR SELECT
  USING (store_id IN (SELECT get_user_store_ids()));

CREATE POLICY "Service role inserts shelf heatmaps"
  ON shelf_heatmaps FOR INSERT
  WITH CHECK (true);

-- 4. TEMPORAL ANALYTICS FUNCTIONS

-- Hourly breakdown for a store (avg visitors per hour of day)
CREATE OR REPLACE FUNCTION get_hourly_breakdown(
  p_store_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (
  hour_of_day INT,
  avg_entries REAL,
  avg_exits REAL,
  total_entries BIGINT,
  sample_days BIGINT
) AS $$
  SELECT
    EXTRACT(HOUR FROM timestamp)::INT AS hour_of_day,
    AVG(entries)::REAL AS avg_entries,
    AVG(exits)::REAL AS avg_exits,
    SUM(entries)::BIGINT AS total_entries,
    COUNT(DISTINCT timestamp::date)::BIGINT AS sample_days
  FROM people_counts
  WHERE store_id = p_store_id
    AND timestamp >= CURRENT_DATE - p_days
  GROUP BY hour_of_day
  ORDER BY hour_of_day;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Day-of-week breakdown
CREATE OR REPLACE FUNCTION get_dow_breakdown(
  p_store_id UUID,
  p_days INT DEFAULT 90
)
RETURNS TABLE (
  day_of_week INT,
  avg_visitors REAL,
  total_visitors BIGINT,
  avg_conversion REAL,
  sample_weeks BIGINT
) AS $$
  SELECT
    EXTRACT(ISODOW FROM date)::INT AS day_of_week,
    AVG(total_visitors)::REAL AS avg_visitors,
    SUM(total_visitors)::BIGINT AS total_visitors,
    AVG(conversion_rate)::REAL AS avg_conversion,
    COUNT(*)::BIGINT AS sample_weeks
  FROM daily_store_summaries
  WHERE store_id = p_store_id
    AND date >= CURRENT_DATE - p_days
  GROUP BY day_of_week
  ORDER BY day_of_week;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Monthly breakdown
CREATE OR REPLACE FUNCTION get_monthly_breakdown(
  p_store_id UUID
)
RETURNS TABLE (
  year_month TEXT,
  total_visitors BIGINT,
  avg_daily_visitors REAL,
  total_transactions BIGINT,
  avg_conversion REAL,
  days_with_data BIGINT
) AS $$
  SELECT
    TO_CHAR(date, 'YYYY-MM') AS year_month,
    SUM(total_visitors)::BIGINT AS total_visitors,
    AVG(total_visitors)::REAL AS avg_daily_visitors,
    SUM(total_transactions)::BIGINT AS total_transactions,
    AVG(conversion_rate)::REAL AS avg_conversion,
    COUNT(*)::BIGINT AS days_with_data
  FROM daily_store_summaries
  WHERE store_id = p_store_id
  GROUP BY year_month
  ORDER BY year_month;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Zone trending (compare last N days vs previous N days)
CREATE OR REPLACE FUNCTION get_zone_trending(
  p_store_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE (
  zone_id UUID,
  zone_name TEXT,
  current_visits BIGINT,
  previous_visits BIGINT,
  change_pct REAL
) AS $$
  WITH current_period AS (
    SELECT zone_id, SUM(total_visits) AS visits
    FROM daily_zone_summaries
    WHERE store_id = p_store_id
      AND date >= CURRENT_DATE - p_days
    GROUP BY zone_id
  ),
  previous_period AS (
    SELECT zone_id, SUM(total_visits) AS visits
    FROM daily_zone_summaries
    WHERE store_id = p_store_id
      AND date >= CURRENT_DATE - (p_days * 2)
      AND date < CURRENT_DATE - p_days
    GROUP BY zone_id
  )
  SELECT
    z.id AS zone_id,
    z.name AS zone_name,
    COALESCE(c.visits, 0)::BIGINT AS current_visits,
    COALESCE(p.visits, 0)::BIGINT AS previous_visits,
    CASE WHEN COALESCE(p.visits, 0) > 0
      THEN ((COALESCE(c.visits, 0) - p.visits)::REAL / p.visits * 100)
      ELSE 0
    END AS change_pct
  FROM zones z
  LEFT JOIN current_period c ON c.zone_id = z.id
  LEFT JOIN previous_period p ON p.zone_id = z.id
  WHERE z.store_id = p_store_id AND z.is_active = true
  ORDER BY change_pct DESC;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Calendar heatmap data (daily visitors for a full year)
CREATE OR REPLACE FUNCTION get_calendar_data(
  p_store_id UUID,
  p_year INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT
)
RETURNS TABLE (
  date DATE,
  total_visitors INT,
  total_transactions INT
) AS $$
  SELECT
    date,
    total_visitors,
    total_transactions
  FROM daily_store_summaries
  WHERE store_id = p_store_id
    AND EXTRACT(YEAR FROM date) = p_year
  ORDER BY date;
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- BLOQUE: supabase_rls_fix.sql
-- ============================================================

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


-- ============================================================
-- BLOQUE: supabase_organizations_insert_policy.sql
-- ============================================================

-- Agregar policy de INSERT para organizations
-- Ejecutar este SQL en Supabase SQL Editor

-- Permitir a usuarios autenticados crear su primera organización
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (true);

-- Nota: Idealmente deberías agregar una validación para que un usuario
-- solo pueda crear UNA organización, pero para el MVP esto es suficiente.
-- En producción considera:
-- 1. Usar un API route para el registro que maneje toda la lógica server-side
-- 2. Agregar un check para verificar que el usuario no tenga ya una organización


-- ============================================================
-- BLOQUE: supabase_simple_register_fix.sql
-- ============================================================

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

