-- ============================================================================
-- RetailVision — Tasa de conversión desde los datos de origen (HU-20)
-- ----------------------------------------------------------------------------
-- Los indicadores de conversión se leían de daily_store_summaries, que nunca se
-- regenera: las transacciones cargadas o importadas (HU-19) no los modificaban.
-- Esta función agrega por día, en la zona horaria de la tienda, los visitantes
-- (entradas de people_counts), las transacciones y el revenue del período.
--
-- SECURITY INVOKER: respeta las políticas RLS de quien consulta.
-- Se ejecuta después de migration_baja_dispositivos.sql. Es idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_conversion_daily(
  p_store_id UUID,
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_tz TEXT DEFAULT 'America/Argentina/Cordoba'
)
RETURNS TABLE(day DATE, visitors BIGINT, transactions BIGINT, revenue NUMERIC)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(
      (p_from AT TIME ZONE p_tz)::DATE,
      ((p_to - INTERVAL '1 second') AT TIME ZONE p_tz)::DATE,
      INTERVAL '1 day'
    )::DATE AS day
  ),
  visits AS (
    SELECT (pc."timestamp" AT TIME ZONE p_tz)::DATE AS day, SUM(pc.entries) AS visitors
      FROM people_counts pc
     WHERE pc.store_id = p_store_id
       AND pc."timestamp" >= p_from
       AND pc."timestamp" < p_to
     GROUP BY 1
  ),
  sales AS (
    SELECT (t."timestamp" AT TIME ZONE p_tz)::DATE AS day, COUNT(*) AS transactions, SUM(t.amount) AS revenue
      FROM transactions t
     WHERE t.store_id = p_store_id
       AND t."timestamp" >= p_from
       AND t."timestamp" < p_to
     GROUP BY 1
  )
  SELECT d.day,
         COALESCE(v.visitors, 0)::BIGINT,
         COALESCE(s.transactions, 0)::BIGINT,
         COALESCE(s.revenue, 0)::NUMERIC
    FROM days d
    LEFT JOIN visits v USING (day)
    LEFT JOIN sales s USING (day)
   ORDER BY d.day;
$$;

GRANT EXECUTE ON FUNCTION public.get_conversion_daily(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

-- Verificación: una fila por día de la semana del 19 al 25 de junio de 2026
SELECT day, visitors, transactions, round(revenue) AS revenue,
       round(transactions * 100.0 / NULLIF(visitors, 0), 1) AS conversion_pct
FROM public.get_conversion_daily(
  (SELECT id FROM stores ORDER BY created_at LIMIT 1),
  '2026-06-19 03:00+00', '2026-06-26 03:00+00'
);
