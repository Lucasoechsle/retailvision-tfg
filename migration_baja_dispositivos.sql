-- ============================================================================
-- RetailVision — Baja lógica de dispositivos de borde (HU-05)
-- ----------------------------------------------------------------------------
-- Borrar un dispositivo elimina en cascada sus conteos (people_counts) y mapas de
-- calor (zone_heatmaps). La baja es lógica: is_active = false conserva el
-- histórico, y la API rota su clave para que la anterior deje de funcionar.
--
-- También se actualiza check_offline_devices() para ignorar los dispositivos
-- dados de baja (no deben figurar offline ni generar alertas).
--
-- Se ejecuta después de migration_dispositivos_offline.sql. Es idempotente.
-- ============================================================================

ALTER TABLE devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

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
   WHERE is_active
     AND status = 'online'
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
         AND d.is_active
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

REVOKE EXECUTE ON FUNCTION public.check_offline_devices() FROM PUBLIC, anon, authenticated;

-- Verificación: todos los dispositivos existentes quedan activos
SELECT string_agg(name || ': ' || CASE WHEN is_active THEN 'activo' ELSE 'baja' END, ', ' ORDER BY name) AS dispositivos
FROM devices;
