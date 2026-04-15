-- Script simplificado para crear store y device
-- Ejecutar TODO de una vez en Supabase SQL Editor

WITH user_org AS (
  SELECT organization_id
  FROM user_profiles
  WHERE id = 'b897a957-9046-4416-af32-992c71a271b4'
),
new_store AS (
  INSERT INTO stores (organization_id, name, address, timezone, is_active)
  SELECT
    organization_id,
    'Tienda Principal',
    'Dirección de prueba',
    'America/Argentina/Cordoba',
    true
  FROM user_org
  RETURNING id
)
INSERT INTO devices (store_id, api_key, name, status)
SELECT
  id,
  'test_device_key_123',
  'Cámara Notebook',
  'offline'
FROM new_store
RETURNING *;

-- Verificar que se creó todo
SELECT
  o.name as organization,
  s.id as store_id,
  s.name as store_name,
  d.id as device_id,
  d.name as device_name,
  d.api_key
FROM organizations o
JOIN stores s ON s.organization_id = o.id
JOIN devices d ON d.store_id = s.id
WHERE o.id IN (
  SELECT organization_id
  FROM user_profiles
  WHERE id = 'b897a957-9046-4416-af32-992c71a271b4'
);
