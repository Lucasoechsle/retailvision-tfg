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
