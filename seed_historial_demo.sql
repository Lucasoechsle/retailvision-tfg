-- ============================================================
-- RetailVision — Historial de los datos de demostración
-- ------------------------------------------------------------
-- Los datos de demostración cubren una sola semana, así que las
-- comparaciones con la semana anterior (tráfico, HU-10) y con el
-- período anterior (conversión, HU-20) no tienen contra qué comparar.
--
-- Este script genera 9 semanas de historial antes de esa semana,
-- copiando sus conteos de personas (people_counts de 5 minutos) y sus
-- ventas del POS simulado (transactions con source = 'pos_api') con:
--   - una tendencia leve: cada semana hacia atrás tiene 2 % menos tráfico
--     y ventas que la siguiente;
--   - ruido aleatorio de ±10 % en cada registro y en cada importe.
-- Cada día se copia del mismo día de la semana de demo (el domingo,
-- del último día, que tiene datos hasta el mediodía). Los datos por
-- zona (mapa de calor, recorridos, dwell) no se copian.
--
-- Correlo una sola vez en: Supabase Dashboard > SQL Editor > Run.
-- Si el historial ya existe, no hace nada. Después, refresh_demo_dates.sql
-- mueve la demo y el historial juntos, como siempre.
--
-- Los días se cuentan en la zona horaria de la tienda. Requiere
-- migration_zona_horaria.sql (store_timezone y refresh_daily_summaries).
-- ============================================================

DO $$
DECLARE
  v_weeks CONSTANT INT := 9;
  v_store UUID;
  v_last  TIMESTAMPTZ;  -- última venta de la demo
  v_tz    TEXT;
  v_end   TIMESTAMPTZ;  -- fin del último día de demo
  v_start TIMESTAMPTZ;  -- inicio del primer día de demo
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
  v_end := (((v_last AT TIME ZONE v_tz)::DATE) + 1)::TIMESTAMP AT TIME ZONE v_tz;
  v_start := v_end - INTERVAL '7 days';

  IF EXISTS (SELECT 1 FROM transactions WHERE source = 'pos_api' AND "timestamp" < v_start) THEN
    RAISE NOTICE 'El historial ya existe. No se hace nada.';
    RETURN;
  END IF;

  FOR v_week IN 1..v_weeks LOOP
    v_trend := 1 - 0.02 * v_week;

    -- Solo los registros de 5 minutos de la demo (las pruebas con la cámara real no se copian)
    INSERT INTO people_counts (device_id, store_id, "timestamp", entries, exits, current_inside, period_seconds)
    SELECT pc.device_id,
           pc.store_id,
           pc."timestamp" - v_week * INTERVAL '7 days',
           round(pc.entries * v_trend * (0.9 + random() * 0.2))::INT,
           round(pc.exits * v_trend * (0.9 + random() * 0.2))::INT,
           pc.current_inside,
           pc.period_seconds
      FROM people_counts pc
     WHERE pc."timestamp" >= v_start
       AND pc."timestamp" < v_end
       AND pc.period_seconds = 300;

    -- Se conserva cada venta con probabilidad v_trend, para seguir la tendencia del tráfico
    INSERT INTO transactions (store_id, "timestamp", amount, items_count, source)
    SELECT t.store_id,
           t."timestamp" - v_week * INTERVAL '7 days',
           round((t.amount * (0.9 + random() * 0.2))::NUMERIC, 2),
           t.items_count,
           t.source
      FROM transactions t
     WHERE t.source = 'pos_api'
       AND t."timestamp" >= v_start
       AND t."timestamp" < v_end
       AND random() < v_trend;
  END LOOP;

  -- Resúmenes diarios: se recalculan con el historial incluido
  DELETE FROM daily_store_summaries;
  DELETE FROM daily_zone_summaries;
  PERFORM public.refresh_daily_summaries(
    (public.store_today(v_store) - (v_start AT TIME ZONE v_tz)::DATE) + v_weeks * 7
  );

  RAISE NOTICE 'OK: % semanas de historial generadas antes del %.', v_weeks, (v_start AT TIME ZONE v_tz)::DATE;
END $$;

-- Verificación: entradas y ventas por semana (la última es la semana de demo)
WITH visitas AS (
  SELECT date_trunc('week', "timestamp")::DATE AS semana, SUM(entries) AS entradas
    FROM people_counts WHERE period_seconds = 300 GROUP BY 1
),
ventas AS (
  SELECT date_trunc('week', "timestamp")::DATE AS semana, COUNT(*) AS ventas
    FROM transactions WHERE source = 'pos_api' GROUP BY 1
)
SELECT semana, entradas, ventas
  FROM visitas FULL JOIN ventas USING (semana)
 ORDER BY semana;
