-- ============================================================================
-- RetailVision — Recalcular automáticamente los resúmenes diarios
-- ----------------------------------------------------------------------------
-- daily_store_summaries y daily_zone_summaries alimentan el overview, el
-- benchmark, los insights, las predicciones y las métricas de campañas, pero
-- nada los recalculaba: solo existían los de los datos de demostración.
--
-- refresh_daily_summaries(p_days) recalcula, para cada tienda y zona activa con
-- datos en el día, los resúmenes desde hace p_days días hasta hoy, con las
-- funciones generate_daily_store_summary y generate_daily_zone_summary. No crea
-- filas para días sin datos. Una tarea de pg_cron la ejecuta cada 5 minutos
-- sobre hoy y ayer, así los módulos reflejan lo que registra la cámara.
--
-- Se ejecuta después de migration_conversion.sql. Es idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_daily_summaries(p_days INT DEFAULT 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day DATE;
  v_store RECORD;
  v_zone RECORD;
  v_count INT := 0;
BEGIN
  FOR v_day IN
    SELECT generate_series(CURRENT_DATE - p_days, CURRENT_DATE, INTERVAL '1 day')::DATE
  LOOP
    FOR v_store IN
      SELECT s.id
        FROM stores s
       WHERE s.is_active
         AND (
           EXISTS (SELECT 1 FROM people_counts pc
                    WHERE pc.store_id = s.id AND pc."timestamp" >= v_day AND pc."timestamp" < v_day + 1)
           OR EXISTS (SELECT 1 FROM transactions t
                       WHERE t.store_id = s.id AND t."timestamp" >= v_day AND t."timestamp" < v_day + 1)
         )
    LOOP
      PERFORM generate_daily_store_summary(v_store.id, v_day);
      v_count := v_count + 1;
    END LOOP;

    FOR v_zone IN
      SELECT z.id
        FROM zones z
        JOIN stores s ON s.id = z.store_id
       WHERE z.is_active
         AND s.is_active
         AND (
           EXISTS (SELECT 1 FROM zone_traffic zt
                    WHERE zt.zone_id = z.id AND zt."timestamp" >= v_day AND zt."timestamp" < v_day + 1)
           OR EXISTS (SELECT 1 FROM dwell_events d
                       WHERE d.zone_id = z.id AND d.entered_at >= v_day AND d.entered_at < v_day + 1)
         )
    LOOP
      PERFORM generate_daily_zone_summary(v_zone.id, v_day);
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Solo la tarea programada y el SQL Editor (rol postgres) la ejecutan
REVOKE EXECUTE ON FUNCTION public.refresh_daily_summaries(INT) FROM PUBLIC, anon, authenticated;

SELECT cron.schedule(
  'retailvision-resumenes-diarios',
  '*/5 * * * *',
  'SELECT public.refresh_daily_summaries(1)'
);

-- Verificación: recalcula ahora y muestra las tareas programadas del proyecto
SELECT public.refresh_daily_summaries(1) AS resumenes_de_tienda_recalculados,
       (SELECT string_agg(jobname || ' (' || schedule || ')', ', ' ORDER BY jobname)
          FROM cron.job WHERE jobname LIKE 'retailvision-%') AS tareas_programadas;
