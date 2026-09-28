-- ============================================================
-- RetailVision — Horario de los datos de demostración
-- ------------------------------------------------------------
-- Los datos de demostración se generaron con la hora local de la
-- tienda guardada como si fuera UTC: la tienda abre de 09 a 21 y los
-- registros van de 09 a 21 UTC, que en Córdoba son de 06 a 18. Este
-- script reinterpreta esa hora como hora de la tienda (en Córdoba,
-- +3 h), así cada pantalla la muestra donde corresponde.
--
-- Solo toca los datos generados, que tienen segundos enteros (lo que
-- envía la cámara tiene fracciones de segundo). Además:
--   - conteos de personas: solo los registros de 5 minutos;
--   - ventas: solo las del POS simulado (source = 'pos_api');
--   - alertas: solo las que no generó el sistema (sin data.trigger).
--
-- Correlo una sola vez en: Supabase Dashboard > SQL Editor > Run,
-- después de migration_zona_horaria.sql. Si ya se aplicó, no hace nada.
-- ============================================================

DO $$
DECLARE
  v_days INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM people_counts pc
     WHERE pc.period_seconds = 300
       AND pc."timestamp" = date_trunc('second', pc."timestamp")
       AND EXTRACT(HOUR FROM pc."timestamp" AT TIME ZONE public.store_timezone(pc.store_id)) < 8
  ) THEN
    RAISE NOTICE 'Los datos de demostración ya están en la hora de la tienda. No se hace nada.';
    RETURN;
  END IF;

  UPDATE people_counts
     SET "timestamp" = ("timestamp" AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
   WHERE period_seconds = 300
     AND "timestamp" = date_trunc('second', "timestamp");

  UPDATE transactions
     SET "timestamp" = ("timestamp" AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
   WHERE source = 'pos_api';

  UPDATE zone_traffic
     SET "timestamp" = ("timestamp" AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
   WHERE "timestamp" = date_trunc('second', "timestamp");

  UPDATE zone_heatmaps
     SET "timestamp" = ("timestamp" AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
   WHERE "timestamp" = date_trunc('second', "timestamp");

  UPDATE zone_transitions
     SET "timestamp" = ("timestamp" AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
   WHERE "timestamp" = date_trunc('second', "timestamp");

  UPDATE queue_snapshots
     SET "timestamp" = ("timestamp" AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
   WHERE "timestamp" = date_trunc('second', "timestamp");

  UPDATE shelf_heatmaps
     SET "timestamp" = ("timestamp" AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
   WHERE "timestamp" = date_trunc('second', "timestamp");

  UPDATE dwell_events
     SET entered_at = (entered_at AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id),
         exited_at  = CASE WHEN exited_at IS NOT NULL
                        THEN (exited_at AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
                      END
   WHERE entered_at = date_trunc('second', entered_at);

  UPDATE customer_journeys
     SET started_at = (started_at AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id),
         ended_at   = (ended_at AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
   WHERE started_at = date_trunc('second', started_at);

  UPDATE alert_events
     SET triggered_at = (triggered_at AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id),
         resolved_at  = CASE WHEN resolved_at IS NOT NULL
                          THEN (resolved_at AT TIME ZONE 'UTC') AT TIME ZONE public.store_timezone(store_id)
                        END
   WHERE NOT (COALESCE(data, '{}'::JSONB) ? 'trigger');

  -- Resúmenes diarios: se recalculan con los días y horas de la tienda
  SELECT (CURRENT_DATE - MIN("timestamp")::DATE) + 1 INTO v_days
    FROM transactions WHERE source = 'pos_api';
  DELETE FROM daily_store_summaries;
  DELETE FROM daily_zone_summaries;
  PERFORM public.refresh_daily_summaries(GREATEST(COALESCE(v_days, 1), 1));

  RAISE NOTICE 'OK: datos de demostración pasados a la hora de la tienda.';
END $$;

-- Verificación: horas (de la tienda) con conteos de la demo; deberían ir de 09 a 21
SELECT EXTRACT(HOUR FROM pc."timestamp" AT TIME ZONE public.store_timezone(pc.store_id))::INT AS hora,
       SUM(pc.entries) AS entradas
  FROM people_counts pc
 WHERE pc.period_seconds = 300
 GROUP BY 1
 ORDER BY 1;
