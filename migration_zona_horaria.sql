-- ============================================================================
-- RetailVision — Horas y días en la zona horaria de la tienda
-- ----------------------------------------------------------------------------
-- Varias funciones agrupaban por hora o por día en UTC ("timestamp"::DATE,
-- EXTRACT(HOUR FROM "timestamp"), CURRENT_DATE). En Córdoba (UTC-3) eso corre
-- las horas 3 h y corta los días a las 21 h. Esta migración las pasa a la zona
-- horaria de cada tienda (stores.timezone), sin cambiar sus parámetros ni lo que
-- devuelven:
--   - get_hourly_traffic y get_hourly_breakdown (detalle de tienda, análisis temporal)
--   - generate_daily_store_summary y generate_daily_zone_summary (resúmenes diarios)
--   - refresh_daily_summaries (tarea programada de resúmenes)
--   - get_journey_patterns y get_zone_flow (recorridos)
--   - get_dow_breakdown y get_zone_trending (el "hoy" de la tienda)
--
-- Se ejecuta después de migration_trafico.sql. Es idempotente.
-- ============================================================================

-- Zona horaria de una tienda (por defecto, la de Córdoba)
CREATE OR REPLACE FUNCTION public.store_timezone(p_store_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(s.timezone, '') FROM stores s WHERE s.id = p_store_id),
    'America/Argentina/Cordoba'
  );
$$;

-- Fecha de hoy en la tienda
CREATE OR REPLACE FUNCTION public.store_today(p_store_id UUID)
RETURNS DATE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (now() AT TIME ZONE public.store_timezone(p_store_id))::DATE;
$$;

GRANT EXECUTE ON FUNCTION public.store_timezone(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_today(UUID) TO authenticated;

-- ----------------------------------------------------------------------------
-- Tráfico promedio por hora (detalle de tienda)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hourly_traffic(
  p_store_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE(hour INT, avg_entries FLOAT, avg_exits FLOAT, avg_inside FLOAT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz TEXT := public.store_timezone(p_store_id);
BEGIN
  RETURN QUERY
  SELECT EXTRACT(HOUR FROM pc."timestamp" AT TIME ZONE v_tz)::INT,
         AVG(pc.entries)::FLOAT,
         AVG(pc.exits)::FLOAT,
         AVG(pc.current_inside)::FLOAT
    FROM people_counts pc
   WHERE pc.store_id = p_store_id
     AND pc."timestamp" >= now() - (p_days || ' days')::INTERVAL
   GROUP BY 1
   ORDER BY 1;
END;
$$;

-- ----------------------------------------------------------------------------
-- Distribución por hora del día (análisis temporal)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hourly_breakdown(
  p_store_id UUID,
  p_days INT DEFAULT 30
)
RETURNS TABLE (hour_of_day INT, avg_entries REAL, avg_exits REAL, total_entries BIGINT, sample_days BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH local_counts AS (
    SELECT pc."timestamp" AT TIME ZONE public.store_timezone(p_store_id) AS local_ts,
           pc.entries,
           pc.exits
      FROM people_counts pc
     WHERE pc.store_id = p_store_id
       AND pc."timestamp" >= (public.store_today(p_store_id) - p_days)::TIMESTAMP
                             AT TIME ZONE public.store_timezone(p_store_id)
  )
  SELECT EXTRACT(HOUR FROM local_ts)::INT,
         AVG(entries)::REAL,
         AVG(exits)::REAL,
         SUM(entries)::BIGINT,
         COUNT(DISTINCT local_ts::DATE)::BIGINT
    FROM local_counts
   GROUP BY 1
   ORDER BY 1;
$$;

-- ----------------------------------------------------------------------------
-- Día de la semana y tendencia por zona: "hoy" es el de la tienda
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dow_breakdown(
  p_store_id UUID,
  p_days INT DEFAULT 90
)
RETURNS TABLE (day_of_week INT, avg_visitors REAL, total_visitors BIGINT, avg_conversion REAL, sample_weeks BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXTRACT(ISODOW FROM dss.date)::INT,
         AVG(dss.total_visitors)::REAL,
         SUM(dss.total_visitors)::BIGINT,
         AVG(dss.conversion_rate)::REAL,
         COUNT(*)::BIGINT
    FROM daily_store_summaries dss
   WHERE dss.store_id = p_store_id
     AND dss.date >= public.store_today(p_store_id) - p_days
   GROUP BY 1
   ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.get_zone_trending(
  p_store_id UUID,
  p_days INT DEFAULT 7
)
RETURNS TABLE (zone_id UUID, zone_name TEXT, current_visits BIGINT, previous_visits BIGINT, change_pct REAL)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_period AS (
    SELECT dzs.zone_id, SUM(dzs.total_visits) AS visits
      FROM daily_zone_summaries dzs
     WHERE dzs.store_id = p_store_id
       AND dzs.date >= public.store_today(p_store_id) - p_days
     GROUP BY dzs.zone_id
  ),
  previous_period AS (
    SELECT dzs.zone_id, SUM(dzs.total_visits) AS visits
      FROM daily_zone_summaries dzs
     WHERE dzs.store_id = p_store_id
       AND dzs.date >= public.store_today(p_store_id) - (p_days * 2)
       AND dzs.date < public.store_today(p_store_id) - p_days
     GROUP BY dzs.zone_id
  )
  SELECT z.id,
         z.name,
         COALESCE(c.visits, 0)::BIGINT,
         COALESCE(p.visits, 0)::BIGINT,
         CASE WHEN COALESCE(p.visits, 0) > 0
           THEN ((COALESCE(c.visits, 0) - p.visits)::REAL / p.visits * 100)
           ELSE 0
         END::REAL
    FROM zones z
    LEFT JOIN current_period c ON c.zone_id = z.id
    LEFT JOIN previous_period p ON p.zone_id = z.id
   WHERE z.store_id = p_store_id AND z.is_active = true
   ORDER BY 5 DESC;
$$;

-- ----------------------------------------------------------------------------
-- Resúmenes diarios: el día y la hora pico son los de la tienda
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_daily_store_summary(
  p_store_id UUID,
  p_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz TEXT := public.store_timezone(p_store_id);
  v_from TIMESTAMPTZ := p_date::TIMESTAMP AT TIME ZONE v_tz;
  v_to TIMESTAMPTZ := (p_date + 1)::TIMESTAMP AT TIME ZONE v_tz;
  v_total_visitors INT;
  v_peak_hour INT;
  v_peak_occupancy INT;
  v_avg_dwell FLOAT;
  v_total_transactions INT;
  v_total_revenue DECIMAL;
  v_conversion_rate FLOAT;
BEGIN
  SELECT COALESCE(SUM(pc.entries), 0), COALESCE(MAX(pc.current_inside), 0)
    INTO v_total_visitors, v_peak_occupancy
    FROM people_counts pc
   WHERE pc.store_id = p_store_id
     AND pc."timestamp" >= v_from
     AND pc."timestamp" < v_to;

  SELECT EXTRACT(HOUR FROM pc."timestamp" AT TIME ZONE v_tz)::INT
    INTO v_peak_hour
    FROM people_counts pc
   WHERE pc.store_id = p_store_id
     AND pc."timestamp" >= v_from
     AND pc."timestamp" < v_to
   GROUP BY 1
   ORDER BY SUM(pc.entries) DESC
   LIMIT 1;

  SELECT AVG(d.dwell_seconds)
    INTO v_avg_dwell
    FROM dwell_events d
   WHERE d.store_id = p_store_id
     AND d.entered_at >= v_from
     AND d.entered_at < v_to
     AND d.dwell_seconds IS NOT NULL;

  SELECT COUNT(*), COALESCE(SUM(t.amount), 0)
    INTO v_total_transactions, v_total_revenue
    FROM transactions t
   WHERE t.store_id = p_store_id
     AND t."timestamp" >= v_from
     AND t."timestamp" < v_to;

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
$$;

CREATE OR REPLACE FUNCTION public.generate_daily_zone_summary(
  p_zone_id UUID,
  p_date DATE DEFAULT CURRENT_DATE - 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
  v_tz TEXT;
  v_from TIMESTAMPTZ;
  v_to TIMESTAMPTZ;
  v_total_visits INT;
  v_avg_dwell FLOAT;
  v_engagement_rate FLOAT;
  v_peak_hour INT;
BEGIN
  SELECT z.store_id INTO v_store_id FROM zones z WHERE z.id = p_zone_id;
  v_tz := public.store_timezone(v_store_id);
  v_from := p_date::TIMESTAMP AT TIME ZONE v_tz;
  v_to := (p_date + 1)::TIMESTAMP AT TIME ZONE v_tz;

  SELECT COALESCE(SUM(zt.entries), 0)
    INTO v_total_visits
    FROM zone_traffic zt
   WHERE zt.zone_id = p_zone_id
     AND zt."timestamp" >= v_from
     AND zt."timestamp" < v_to;

  SELECT AVG(d.dwell_seconds),
         CASE WHEN COUNT(*) > 0
           THEN COUNT(*) FILTER (WHERE d.engagement_type IN ('browse', 'engaged'))::FLOAT / COUNT(*) * 100
           ELSE NULL
         END
    INTO v_avg_dwell, v_engagement_rate
    FROM dwell_events d
   WHERE d.zone_id = p_zone_id
     AND d.entered_at >= v_from
     AND d.entered_at < v_to
     AND d.dwell_seconds IS NOT NULL;

  SELECT EXTRACT(HOUR FROM zt."timestamp" AT TIME ZONE v_tz)::INT
    INTO v_peak_hour
    FROM zone_traffic zt
   WHERE zt.zone_id = p_zone_id
     AND zt."timestamp" >= v_from
     AND zt."timestamp" < v_to
   GROUP BY 1
   ORDER BY SUM(zt.entries) DESC
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
$$;

-- La tarea programada recalcula hoy y ayer según la fecha de cada tienda
CREATE OR REPLACE FUNCTION public.refresh_daily_summaries(p_days INT DEFAULT 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store RECORD;
  v_zone RECORD;
  v_day DATE;
  v_from TIMESTAMPTZ;
  v_to TIMESTAMPTZ;
  v_count INT := 0;
BEGIN
  FOR v_store IN
    SELECT s.id, public.store_timezone(s.id) AS tz, public.store_today(s.id) AS today
      FROM stores s
     WHERE s.is_active
  LOOP
    FOR v_day IN
      SELECT generate_series(v_store.today - p_days, v_store.today, INTERVAL '1 day')::DATE
    LOOP
      v_from := v_day::TIMESTAMP AT TIME ZONE v_store.tz;
      v_to := (v_day + 1)::TIMESTAMP AT TIME ZONE v_store.tz;

      IF EXISTS (SELECT 1 FROM people_counts pc
                  WHERE pc.store_id = v_store.id AND pc."timestamp" >= v_from AND pc."timestamp" < v_to)
         OR EXISTS (SELECT 1 FROM transactions t
                     WHERE t.store_id = v_store.id AND t."timestamp" >= v_from AND t."timestamp" < v_to)
      THEN
        PERFORM public.generate_daily_store_summary(v_store.id, v_day);
        v_count := v_count + 1;
      END IF;

      FOR v_zone IN
        SELECT z.id
          FROM zones z
         WHERE z.store_id = v_store.id
           AND z.is_active
           AND (
             EXISTS (SELECT 1 FROM zone_traffic zt
                      WHERE zt.zone_id = z.id AND zt."timestamp" >= v_from AND zt."timestamp" < v_to)
             OR EXISTS (SELECT 1 FROM dwell_events d
                         WHERE d.zone_id = z.id AND d.entered_at >= v_from AND d.entered_at < v_to)
           )
      LOOP
        PERFORM public.generate_daily_zone_summary(v_zone.id, v_day);
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- Recorridos: las fechas del filtro son días de la tienda
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_journey_patterns(
  p_store_id UUID,
  p_start DATE DEFAULT CURRENT_DATE,
  p_end DATE DEFAULT CURRENT_DATE,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (pattern TEXT, frequency BIGINT, avg_dwell REAL, avg_zones INT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT array_to_string(
           ARRAY(SELECT elem->>'zone_id' FROM jsonb_array_elements(cj.journey_data) AS elem),
           ' → '
         ) AS pattern,
         COUNT(*),
         AVG(cj.total_dwell_seconds)::REAL,
         AVG(cj.total_zones_visited)::INT
    FROM customer_journeys cj
   WHERE cj.store_id = p_store_id
     AND cj.started_at >= p_start::TIMESTAMP AT TIME ZONE public.store_timezone(p_store_id)
     AND cj.started_at < (p_end + 1)::TIMESTAMP AT TIME ZONE public.store_timezone(p_store_id)
   GROUP BY 1
   ORDER BY 2 DESC
   LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_zone_flow(
  p_store_id UUID,
  p_start DATE DEFAULT CURRENT_DATE,
  p_end DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (from_zone_id UUID, to_zone_id UUID, total_transitions BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT zt.from_zone_id, zt.to_zone_id, SUM(zt.transition_count)::BIGINT
    FROM zone_transitions zt
   WHERE zt.store_id = p_store_id
     AND zt."timestamp" >= p_start::TIMESTAMP AT TIME ZONE public.store_timezone(p_store_id)
     AND zt."timestamp" < (p_end + 1)::TIMESTAMP AT TIME ZONE public.store_timezone(p_store_id)
   GROUP BY zt.from_zone_id, zt.to_zone_id
   ORDER BY 3 DESC;
$$;

-- Verificación: zona horaria y fecha de hoy de cada tienda, y horas con tráfico
SELECT s.name,
       public.store_timezone(s.id) AS zona_horaria,
       public.store_today(s.id) AS hoy,
       (SELECT string_agg(h.hour::TEXT, ', ' ORDER BY h.hour)
          FROM public.get_hourly_traffic(s.id, 7) h) AS horas_con_trafico
  FROM stores s
 ORDER BY s.created_at;
