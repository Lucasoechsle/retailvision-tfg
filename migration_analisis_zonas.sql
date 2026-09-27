-- ============================================================================
-- RetailVision — Análisis por zona (HU-15)
-- ----------------------------------------------------------------------------
-- Agrega por zona los eventos de permanencia (dwell_events) de un período:
-- visitas, dwell time promedio y la clasificación de engagement que calcula el
-- edge: pass (< 5 s), browse (5 a 30 s) y engaged (30 s o más).
--
-- SECURITY INVOKER: se ejecuta con los permisos de quien consulta, así que las
-- políticas RLS limitan el resultado a las zonas de su organización.
--
-- Se ejecuta después de migration_roles_baja_logica.sql. Es idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_zone_engagement(
  p_store_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ
)
RETURNS TABLE(
  zone_id UUID,
  zone_name TEXT,
  zone_type TEXT,
  zone_color TEXT,
  visits BIGINT,
  avg_dwell_seconds FLOAT,
  pass_count BIGINT,
  browse_count BIGINT,
  engaged_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    z.id,
    z.name,
    z.zone_type,
    z.color,
    count(d.id),
    avg(d.dwell_seconds)::FLOAT,
    count(d.id) FILTER (WHERE d.engagement_type = 'pass'),
    count(d.id) FILTER (WHERE d.engagement_type = 'browse'),
    count(d.id) FILTER (WHERE d.engagement_type = 'engaged')
  FROM zones z
  LEFT JOIN dwell_events d
    ON d.zone_id = z.id
   AND d.entered_at >= p_from
   AND d.entered_at < p_to
  WHERE z.store_id = p_store_id
    AND z.is_active
  GROUP BY z.id, z.name, z.zone_type, z.color, z.sort_order
  ORDER BY count(d.id) DESC, z.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_zone_engagement(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Verificación: debe devolver una fila por zona activa de la primera tienda
SELECT zone_name, visits, round(avg_dwell_seconds::numeric, 1) AS dwell_s,
       pass_count, browse_count, engaged_count
FROM public.get_zone_engagement(
  (SELECT id FROM stores ORDER BY created_at LIMIT 1),
  '2000-01-01', now()
);
