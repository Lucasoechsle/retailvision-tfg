-- Script completo que crea TODO desde cero
-- Ejecutar TODO de una vez en Supabase SQL Editor

DO $$
DECLARE
  v_org_id UUID;
  v_store_id UUID;
  v_device_id UUID;
  v_user_id UUID := 'b897a957-9046-4416-af32-992c71a271b4';
BEGIN
  -- 1. Verificar/Crear organización
  SELECT id INTO v_org_id
  FROM organizations
  WHERE id IN (SELECT organization_id FROM user_profiles WHERE id = v_user_id)
  LIMIT 1;

  IF v_org_id IS NULL THEN
    -- No hay organización vinculada, buscar si hay alguna huérfana o crear nueva
    SELECT id INTO v_org_id
    FROM organizations
    WHERE NOT EXISTS (
      SELECT 1 FROM user_profiles WHERE organization_id = organizations.id
    )
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_org_id IS NULL THEN
      -- Crear nueva organización
      INSERT INTO organizations (name, slug, plan)
      VALUES ('Mi Tienda', 'mi-tienda-' || EXTRACT(EPOCH FROM NOW())::BIGINT, 'trial')
      RETURNING id INTO v_org_id;

      RAISE NOTICE 'Nueva organización creada: %', v_org_id;
    ELSE
      RAISE NOTICE 'Usando organización existente: %', v_org_id;
    END IF;
  END IF;

  -- 2. Crear/Actualizar user_profile
  INSERT INTO user_profiles (id, organization_id, role, full_name)
  VALUES (v_user_id, v_org_id, 'admin', 'Luki Oechsle')
  ON CONFLICT (id) DO UPDATE
  SET organization_id = EXCLUDED.organization_id,
      role = EXCLUDED.role,
      full_name = EXCLUDED.full_name;

  RAISE NOTICE 'User profile actualizado para org: %', v_org_id;

  -- 3. Crear store
  INSERT INTO stores (organization_id, name, address, timezone, is_active)
  VALUES (v_org_id, 'Tienda Principal', 'Dirección de prueba', 'America/Argentina/Cordoba', true)
  RETURNING id INTO v_store_id;

  RAISE NOTICE 'Store creado: %', v_store_id;

  -- 4. Crear device
  INSERT INTO devices (store_id, api_key, name, status)
  VALUES (v_store_id, 'test_device_key_123', 'Cámara Notebook', 'offline')
  RETURNING id INTO v_device_id;

  RAISE NOTICE 'Device creado: %', v_device_id;

END $$;

-- Verificar resultado final
SELECT
  o.id as org_id,
  o.name as organization,
  up.full_name as user_name,
  up.role,
  s.id as store_id,
  s.name as store_name,
  d.id as device_id,
  d.name as device_name,
  d.api_key,
  d.status
FROM organizations o
JOIN user_profiles up ON up.organization_id = o.id
JOIN stores s ON s.organization_id = o.id
JOIN devices d ON d.store_id = s.id
WHERE up.id = 'b897a957-9046-4416-af32-992c71a271b4';
