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
