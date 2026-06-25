-- ============================================================
-- RetailVision — Refresco de fechas de demo
-- Desplaza TODOS los datos para que el registro más reciente sea HOY.
-- Correlo en: Supabase Dashboard > SQL Editor > New query > Run
-- Es idempotente y reutilizable: corrélo antes de cada demo/defensa.
-- ============================================================

DO $$
DECLARE
  v_days int;
  v_off  interval;
BEGIN
  -- Calcula cuántos días hay que mover (hoy - fecha del dato más reciente)
  SELECT (CURRENT_DATE - MAX(timestamp)::date) INTO v_days FROM people_counts;

  IF v_days IS NULL OR v_days <= 0 THEN
    RAISE NOTICE 'Datos ya frescos (offset = % dias). No se hace nada.', v_days;
    RETURN;
  END IF;

  v_off := v_days * interval '1 day';

  -- Tablas con columna "timestamp"
  UPDATE people_counts     SET timestamp = timestamp + v_off;
  UPDATE zone_heatmaps     SET timestamp = timestamp + v_off;
  UPDATE zone_traffic      SET timestamp = timestamp + v_off;
  UPDATE zone_transitions  SET timestamp = timestamp + v_off;
  UPDATE queue_snapshots   SET timestamp = timestamp + v_off;
  UPDATE transactions      SET timestamp = timestamp + v_off;
  UPDATE shelf_heatmaps    SET timestamp = timestamp + v_off;

  -- Tablas con dos columnas de fecha
  UPDATE dwell_events
    SET entered_at = entered_at + v_off,
        exited_at  = CASE WHEN exited_at IS NOT NULL THEN exited_at + v_off ELSE NULL END;

  UPDATE customer_journeys
    SET started_at = started_at + v_off,
        ended_at   = CASE WHEN ended_at IS NOT NULL THEN ended_at + v_off ELSE NULL END;

  UPDATE alert_events
    SET triggered_at = triggered_at + v_off,
        resolved_at  = CASE WHEN resolved_at IS NOT NULL THEN resolved_at + v_off ELSE NULL END;

  -- Resúmenes diarios (columna "date")
  UPDATE daily_store_summaries SET date = date + v_days;
  UPDATE daily_zone_summaries  SET date = date + v_days;

  -- Dispositivos: marcarlos como recién vistos
  UPDATE devices SET last_seen_at = now(), status = 'online' WHERE last_seen_at IS NOT NULL;

  RAISE NOTICE 'OK: fechas desplazadas % dias hacia adelante.', v_days;
END $$;

-- Verificación rápida
SELECT 'people_counts' AS tabla, MAX(timestamp)::date AS mas_reciente FROM people_counts
UNION ALL SELECT 'transactions', MAX(timestamp)::date FROM transactions
UNION ALL SELECT 'daily_store_summaries', MAX(date) FROM daily_store_summaries;
