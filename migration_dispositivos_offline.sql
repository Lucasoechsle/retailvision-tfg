-- ============================================================================
-- RetailVision — Detección de dispositivos offline (HU-05 y HU-12)
-- ----------------------------------------------------------------------------
-- Un dispositivo caído no envía datos, así que no puede evaluarse al recibir la
-- ingesta: se chequea en la base cada minuto con pg_cron.
--
-- 1. Marca como offline los dispositivos sin heartbeat en los últimos 3 minutos
--    (el edge lo envía cada 60 s). El heartbeat vuelve a ponerlos online.
-- 2. Por cada regla activa de tipo device_offline, genera una alerta para cada
--    dispositivo de la tienda que superó el tiempo configurado sin reportar.
--    Mientras la alerta de ese dispositivo siga sin resolver, no se duplica.
--
-- Se ejecuta después de migration_analisis_zonas.sql. Es idempotente.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE OR REPLACE FUNCTION public.check_offline_devices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rule RECORD;
  v_device RECORD;
  v_offline_minutes INT;
  v_created INT := 0;
BEGIN
  -- 1. Estado de conexión
  UPDATE devices
     SET status = 'offline'
   WHERE status = 'online'
     AND (last_seen_at IS NULL OR last_seen_at < now() - interval '3 minutes');

  -- 2. Alertas de dispositivo offline
  FOR v_rule IN
    SELECT r.*
      FROM alert_rules r
      JOIN stores s ON s.id = r.store_id
     WHERE r.rule_type = 'device_offline'
       AND r.is_active
       AND s.is_active
  LOOP
    -- El umbral se configura en minutos (dashboard) o en segundos (datos de demo)
    v_offline_minutes := COALESCE(
      (v_rule.config->>'offline_minutes')::INT,
      CEIL((v_rule.config->>'offline_seconds')::NUMERIC / 60)::INT,
      10
    );

    FOR v_device IN
      SELECT d.id, d.name, d.last_seen_at
        FROM devices d
       WHERE d.store_id = v_rule.store_id
         AND d.last_seen_at IS NOT NULL  -- solo los que alguna vez se conectaron
         AND d.last_seen_at < now() - make_interval(mins => v_offline_minutes)
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM alert_events e
         WHERE e.rule_id = v_rule.id
           AND e.status <> 'resolved'
           AND e.data->>'device_id' = v_device.id::TEXT
      ) THEN
        INSERT INTO alert_events (rule_id, store_id, status, data)
        VALUES (
          v_rule.id,
          v_rule.store_id,
          'active',
          jsonb_build_object(
            'trigger', 'heartbeat',
            'device_id', v_device.id,
            'device', v_device.name,
            'last_seen_at', v_device.last_seen_at,
            'last_seen_minutes', FLOOR(EXTRACT(EPOCH FROM now() - v_device.last_seen_at) / 60)::INT,
            'rule_config', v_rule.config
          )
        );
        v_created := v_created + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN v_created;
END;
$$;

-- Solo la tarea programada (rol postgres) ejecuta la función
REVOKE EXECUTE ON FUNCTION public.check_offline_devices() FROM PUBLIC, anon, authenticated;

-- Tarea cada minuto (cron.schedule reemplaza la tarea si ya existe con ese nombre)
SELECT cron.schedule(
  'retailvision-dispositivos-offline',
  '* * * * *',
  'SELECT public.check_offline_devices()'
);

-- Verificación: ejecuta el chequeo ahora y muestra el estado de los dispositivos
SELECT public.check_offline_devices() AS alertas_generadas,
       (SELECT string_agg(name || ': ' || status, ', ' ORDER BY name) FROM devices) AS dispositivos,
       (SELECT count(*) FROM cron.job WHERE jobname = 'retailvision-dispositivos-offline') AS tarea_programada;
