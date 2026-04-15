-- Crear función con SECURITY DEFINER para bypass RLS
-- Ejecutar TODO en Supabase SQL Editor

-- 1. Crear función que bypasea RLS
CREATE OR REPLACE FUNCTION public.create_test_store_and_device(p_user_id UUID)
RETURNS TABLE (
  organization_name TEXT,
  store_id UUID,
  store_name TEXT,
  device_id UUID,
  device_name TEXT,
  device_api_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_store_id UUID;
  v_device_id UUID;
BEGIN
  -- Obtener organization_id
  SELECT organization_id INTO v_org_id
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró organización para el usuario %', p_user_id;
  END IF;

  -- Crear store
  INSERT INTO stores (organization_id, name, address, timezone, is_active)
  VALUES (
    v_org_id,
    'Tienda Principal',
    'Dirección de prueba',
    'America/Argentina/Cordoba',
    true
  )
  RETURNING id INTO v_store_id;

  -- Crear device
  INSERT INTO devices (store_id, api_key, name, status)
  VALUES (
    v_store_id,
    'test_device_key_123',
    'Cámara Notebook',
    'offline'
  )
  RETURNING id INTO v_device_id;

  -- Retornar resultados
  RETURN QUERY
  SELECT
    o.name::TEXT,
    s.id,
    s.name::TEXT,
    d.id,
    d.name::TEXT,
    d.api_key::TEXT
  FROM organizations o
  JOIN stores s ON s.organization_id = o.id
  JOIN devices d ON d.store_id = s.id
  WHERE s.id = v_store_id AND d.id = v_device_id;
END;
$$;

-- 2. Ejecutar la función para crear store y device
SELECT * FROM public.create_test_store_and_device('b897a957-9046-4416-af32-992c71a271b4');

-- 3. Verificar que todo se creó
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
