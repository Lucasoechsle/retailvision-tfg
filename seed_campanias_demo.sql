-- ============================================================
-- RetailVision — Campañas y datos por zona de la demostración
-- ------------------------------------------------------------
-- 1. Historial por zona: seed_historial_demo.sql copió los conteos y
--    las ventas de la semana de demo hacia atrás, pero no los datos por
--    zona. Sin ellos, el período previo de una campaña no tiene dwell
--    time ni engagement. Acá se copian zone_traffic y dwell_events de
--    la semana de demo a las 9 semanas anteriores, con la misma
--    tendencia (-2 % por semana) y ruido de ±10 %.
-- 2. Campañas de ejemplo: quedaron con fechas de junio, fuera de los
--    datos. Se mueven para que conserven su situación respecto de su
--    fecha de creación: "Promo Pascua" finalizada, "Semana del Lácteo"
--    activa y "Lanzamiento Vinos Premium" planificada. Se les cargan
--    la categoría y el costo de exhibición.
--
-- Correlo una sola vez en: Supabase Dashboard > SQL Editor > Run,
-- después de migration_campanias.sql. Si ya se aplicó, no hace nada.
-- ============================================================

DO $$
DECLARE
  v_weeks CONSTANT INT := 9;
  v_store UUID;
  v_last  TIMESTAMPTZ;
  v_tz    TEXT;
  v_end   TIMESTAMPTZ;  -- fin del último día de demo
  v_start TIMESTAMPTZ;  -- inicio del primer día de demo
  v_last_day  DATE;     -- último día de demo, en la tienda
  v_first_day DATE;     -- primer día con datos, en la tienda
  v_week  INT;
  v_trend NUMERIC;
BEGIN
  SELECT store_id, "timestamp" INTO v_store, v_last
    FROM transactions WHERE source = 'pos_api'
   ORDER BY "timestamp" DESC LIMIT 1;

  IF v_last IS NULL THEN
    RAISE NOTICE 'No se encontraron datos de demostración.';
    RETURN;
  END IF;
  v_tz := public.store_timezone(v_store);
  v_last_day := (v_last AT TIME ZONE v_tz)::DATE;
  v_end := (v_last_day + 1)::TIMESTAMP AT TIME ZONE v_tz;
  v_start := v_end - INTERVAL '7 days';

  -- 1. Historial por zona (solo los datos generados: segundos enteros)
  IF EXISTS (SELECT 1 FROM zone_traffic
              WHERE "timestamp" < v_start AND "timestamp" >= v_start - INTERVAL '7 days'
                AND "timestamp" = date_trunc('second', "timestamp")) THEN
    RAISE NOTICE 'El historial por zona ya existe.';
  ELSE
    FOR v_week IN 1..v_weeks LOOP
      v_trend := 1 - 0.02 * v_week;

      INSERT INTO zone_traffic (zone_id, store_id, device_id, "timestamp", period_seconds,
                                entries, exits, avg_occupancy, peak_occupancy)
      SELECT zt.zone_id, zt.store_id, zt.device_id,
             zt."timestamp" - v_week * INTERVAL '7 days',
             zt.period_seconds,
             round(zt.entries * v_trend * (0.9 + random() * 0.2))::INT,
             round(zt.exits * v_trend * (0.9 + random() * 0.2))::INT,
             zt.avg_occupancy,
             zt.peak_occupancy
        FROM zone_traffic zt
       WHERE zt."timestamp" >= v_start AND zt."timestamp" < v_end
         AND zt."timestamp" = date_trunc('second', zt."timestamp");

      -- Se conserva cada visita con probabilidad v_trend; la permanencia varía ±10 %
      INSERT INTO dwell_events (zone_id, store_id, device_id, track_id, entered_at, exited_at,
                                dwell_seconds, engagement_type)
      SELECT d.zone_id, d.store_id, d.device_id, d.track_id,
             d.entered_at - v_week * INTERVAL '7 days',
             d.exited_at - v_week * INTERVAL '7 days',
             d.dwell_seconds * (0.9 + random() * 0.2),
             d.engagement_type
        FROM dwell_events d
       WHERE d.entered_at >= v_start AND d.entered_at < v_end
         AND d.entered_at = date_trunc('second', d.entered_at)
         AND random() < v_trend;
    END LOOP;
    RAISE NOTICE 'OK: % semanas de historial por zona.', v_weeks;
  END IF;

  -- 2. Campañas de ejemplo que quedaron antes de los datos
  SELECT (MIN("timestamp") AT TIME ZONE v_tz)::DATE INTO v_first_day
    FROM transactions WHERE source = 'pos_api';

  UPDATE campaigns c
     SET start_date     = c.start_date     + (v_last_day - (c.created_at AT TIME ZONE v_tz)::DATE),
         end_date       = c.end_date       + (v_last_day - (c.created_at AT TIME ZONE v_tz)::DATE),
         baseline_start = c.baseline_start + (v_last_day - (c.created_at AT TIME ZONE v_tz)::DATE),
         baseline_end   = c.baseline_end   + (v_last_day - (c.created_at AT TIME ZONE v_tz)::DATE),
         results        = NULL,
         updated_at     = now()
   WHERE c.store_id = v_store
     AND c.end_date < v_first_day;

  UPDATE campaigns SET product_category = 'Chocolates y huevos de Pascua', promo_cost = 150000
   WHERE store_id = v_store AND name = 'Promo Pascua' AND promo_cost IS NULL;
  UPDATE campaigns SET product_category = 'Lácteos', promo_cost = 90000
   WHERE store_id = v_store AND name = 'Semana del Lácteo' AND promo_cost IS NULL;
  UPDATE campaigns SET product_category = 'Vinos', promo_cost = 220000
   WHERE store_id = v_store AND name = 'Lanzamiento Vinos Premium' AND promo_cost IS NULL;

  -- Resúmenes por zona (y de tienda) con el historial nuevo
  DELETE FROM daily_store_summaries;
  DELETE FROM daily_zone_summaries;
  PERFORM public.refresh_daily_summaries(public.store_today(v_store) - v_first_day);

  RAISE NOTICE 'OK: campañas de ejemplo dentro de los datos de demostración.';
END $$;

-- Verificación: campañas de ejemplo y visitas por zona en sus períodos
SELECT c.name,
       c.baseline_start, c.baseline_end, c.start_date, c.end_date,
       c.product_category, c.promo_cost,
       (SELECT SUM(dzs.total_visits) FROM daily_zone_summaries dzs
         WHERE dzs.zone_id = c.zone_id AND dzs.date BETWEEN c.baseline_start AND c.baseline_end) AS visitas_zona_previo,
       (SELECT SUM(dzs.total_visits) FROM daily_zone_summaries dzs
         WHERE dzs.zone_id = c.zone_id AND dzs.date BETWEEN c.start_date AND c.end_date) AS visitas_zona_activo
  FROM campaigns c
 ORDER BY c.start_date;
