-- ============================================================
-- RetailVision — Refresco de fechas de los datos de demostración
-- ------------------------------------------------------------
-- Mueve los datos de demostración para que su último día sea HOY,
-- conservando días de la semana y horarios.
--
-- Los datos de demo se identifican por las ventas del POS simulado
-- (transactions.source = 'pos_api'): se mueve todo lo registrado
-- hasta el último día de esas ventas. Lo posterior (webcam, pruebas,
-- alertas reales) no se toca.
--
-- Correlo en: Supabase Dashboard > SQL Editor > Run, antes de cada
-- demo o de la defensa. Se puede correr las veces que haga falta:
-- si los datos ya terminan hoy, no hace nada.
--
-- Requiere migration_resumenes_diarios.sql (recalcula los resúmenes
-- con refresh_daily_summaries).
-- ============================================================

DO $$
DECLARE
  v_demo_end TIMESTAMPTZ;
  v_days     INT;
  v_off      INTERVAL;
  v_cut      TIMESTAMPTZ;
BEGIN
  SELECT MAX("timestamp") INTO v_demo_end FROM transactions WHERE source = 'pos_api';

  IF v_demo_end IS NULL THEN
    RAISE NOTICE 'No se encontraron datos de demostración.';
    RETURN;
  END IF;

  v_days := CURRENT_DATE - v_demo_end::DATE;
  IF v_days <= 0 THEN
    RAISE NOTICE 'Los datos de demo ya terminan hoy. No se hace nada.';
    RETURN;
  END IF;

  v_off := v_days * INTERVAL '1 day';
  v_cut := date_trunc('day', v_demo_end) + INTERVAL '1 day';  -- fin del último día de demo

  UPDATE people_counts    SET "timestamp" = "timestamp" + v_off WHERE "timestamp" < v_cut;
  UPDATE zone_heatmaps    SET "timestamp" = "timestamp" + v_off WHERE "timestamp" < v_cut;
  UPDATE zone_traffic     SET "timestamp" = "timestamp" + v_off WHERE "timestamp" < v_cut;
  UPDATE zone_transitions SET "timestamp" = "timestamp" + v_off WHERE "timestamp" < v_cut;
  UPDATE queue_snapshots  SET "timestamp" = "timestamp" + v_off WHERE "timestamp" < v_cut;
  UPDATE transactions     SET "timestamp" = "timestamp" + v_off WHERE "timestamp" < v_cut;
  UPDATE shelf_heatmaps   SET "timestamp" = "timestamp" + v_off WHERE "timestamp" < v_cut;

  UPDATE dwell_events
     SET entered_at = entered_at + v_off,
         exited_at  = CASE WHEN exited_at IS NOT NULL THEN exited_at + v_off END
   WHERE entered_at < v_cut;

  UPDATE customer_journeys
     SET started_at = started_at + v_off,
         ended_at   = CASE WHEN ended_at IS NOT NULL THEN ended_at + v_off END
   WHERE started_at < v_cut;

  UPDATE alert_events
     SET triggered_at = triggered_at + v_off,
         resolved_at  = CASE WHEN resolved_at IS NOT NULL THEN resolved_at + v_off END
   WHERE triggered_at < v_cut;

  -- Resúmenes diarios: se recalculan desde los datos de origen ya movidos
  -- (70 días: la semana de demo y las 9 de seed_historial_demo.sql)
  DELETE FROM daily_store_summaries;
  DELETE FROM daily_zone_summaries;
  PERFORM public.refresh_daily_summaries(70);

  RAISE NOTICE 'OK: datos de demo movidos % días hacia adelante.', v_days;
END $$;

-- Verificación: el día más reciente de cada tabla debería ser hoy
SELECT 'people_counts' AS tabla, MAX("timestamp")::DATE AS mas_reciente FROM people_counts
UNION ALL SELECT 'transactions', MAX("timestamp")::DATE FROM transactions
UNION ALL SELECT 'customer_journeys', MAX(started_at)::DATE FROM customer_journeys
UNION ALL SELECT 'daily_store_summaries', MAX(date) FROM daily_store_summaries;
