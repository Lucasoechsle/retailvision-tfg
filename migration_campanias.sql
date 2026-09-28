-- ============================================================================
-- RetailVision — Campañas: categoría, costo de exhibición y resultados (HU-17/18)
-- ----------------------------------------------------------------------------
-- El formulario de campaña pide la categoría de producto y el costo de
-- exhibición (HU-17), y el costo es la base para estimar el ROI (HU-18).
-- results guarda las métricas calculadas cuando la campaña finaliza.
--
-- Se ejecuta después de migration_zona_horaria.sql. Es idempotente.
-- ============================================================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS product_category TEXT;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS promo_cost NUMERIC(12,2)
  CHECK (promo_cost IS NULL OR promo_cost >= 0);

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS results JSONB;

-- Verificación: columnas nuevas de campaigns
SELECT column_name, data_type
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'campaigns'
   AND column_name IN ('product_category', 'promo_cost', 'results')
 ORDER BY column_name;
