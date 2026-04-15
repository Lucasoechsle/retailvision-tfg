-- Fix: Crear user_profile faltante y luego store/device
-- Ejecutar en Supabase SQL Editor

-- 1. Primero verificar si existe una organización sin user_profile asignado
SELECT id, name, slug FROM organizations ORDER BY created_at DESC LIMIT 1;

-- 2. Si existe una organización, crear el user_profile manualmente
-- REEMPLAZA 'ORGANIZATION_ID_AQUI' con el ID de la organización que viste arriba
INSERT INTO user_profiles (id, organization_id, role, full_name)
VALUES (
  'b897a957-9046-4416-af32-992c71a271b4',
  'ORGANIZATION_ID_AQUI',  -- <-- REEMPLAZAR con el UUID de la organización
  'admin',
  'Luki Oechsle'
)
ON CONFLICT (id) DO UPDATE
SET organization_id = EXCLUDED.organization_id,
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

-- 3. Ahora ejecutar la función para crear store y device
SELECT * FROM public.create_test_store_and_device('b897a957-9046-4416-af32-992c71a271b4');

-- 4. Verificar resultado final
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
