-- ============================================================================
-- RetailVision — Tráfico por día y franja horaria (HU-10)
-- ----------------------------------------------------------------------------
-- La pantalla de Tráfico mostraba los últimos 288 registros de people_counts,
-- sin elegir el período ni compararlo con otro. Esta función suma las entradas y
-- salidas del período por día y por hora, en la zona horaria de la tienda. Solo
-- devuelve las franjas con registros; la API completa los huecos con ceros.
--
-- SECURITY INVOKER: respeta las políticas RLS de quien consulta.
-- Se ejecuta después de migration_resumenes_diarios.sql. Es idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_traffic_hourly(
  p_store_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_tz TEXT DEFAULT 'America/Argentina/Cordoba'
)
RETURNS TABLE(day DATE, hour INT, entries BIGINT, exits BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT (pc."timestamp" AT TIME ZONE p_tz)::DATE AS day,
         EXTRACT(HOUR FROM pc."timestamp" AT TIME ZONE p_tz)::INT AS hour,
         SUM(pc.entries)::BIGINT AS entries,
         SUM(pc.exits)::BIGINT AS exits
    FROM people_counts pc
   WHERE pc.store_id = p_store_id
     AND pc."timestamp" >= p_from
     AND pc."timestamp" < p_to
   GROUP BY 1, 2
   ORDER BY 1, 2;
$$;

GRANT EXECUTE ON FUNCTION public.get_traffic_hourly(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

-- Verificación: entradas y salidas por hora de los últimos 7 días de la primera tienda
SELECT hour, SUM(entries) AS entradas, SUM(exits) AS salidas
FROM public.get_traffic_hourly(
  (SELECT id FROM stores ORDER BY created_at LIMIT 1),
  now() - INTERVAL '7 days', now()
)
GROUP BY hour
ORDER BY hour;
