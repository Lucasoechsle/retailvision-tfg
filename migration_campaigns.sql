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
