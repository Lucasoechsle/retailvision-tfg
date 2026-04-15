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
