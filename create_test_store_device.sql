-- Crear store y device para testing
-- Ejecutar en Supabase SQL Editor

-- 1. Primero, obtener el organization_id del usuario
-- Copia el resultado de esta query:
SELECT id as organization_id, name as organization_name
FROM organizations
WHERE id = (
  SELECT organization_id
  FROM user_profiles
  WHERE id = 'b897a957-9046-4416-af32-992c71a271b4'
);

-- 2. IMPORTANTE: Copia el organization_id del resultado anterior y reemplázalo abajo
-- Luego ejecuta todo desde aquí hacia abajo:

-- Crear store (reemplaza 'ORGANIZATION_ID_AQUI' con el UUID que copiaste)
INSERT INTO stores (organization_id, name, address, timezone, is_active)
VALUES (
  'ORGANIZATION_ID_AQUI',  -- <-- REEMPLAZAR CON TU ORGANIZATION ID
  'Tienda Principal',
  'Dirección de prueba',
  'America/Argentina/Cordoba',
  true
)
RETURNING id, name;

-- 3. Copiar el store_id del resultado anterior y reemplazarlo abajo

-- Crear device (reemplaza 'STORE_ID_AQUI' con el UUID del store)
INSERT INTO devices (store_id, api_key, name, status)
VALUES (
  'STORE_ID_AQUI',  -- <-- REEMPLAZAR CON TU STORE ID
  'test_device_key_123',
  'Cámara Notebook',
  'offline'
)
RETURNING id, name, api_key;

-- 4. Verificar que todo se creó correctamente
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
