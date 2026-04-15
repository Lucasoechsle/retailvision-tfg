-- Script de diagnóstico
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar usuarios en auth
SELECT id, email, created_at
FROM auth.users
WHERE email = 'lukioechsle9@gmail.com';

-- 2. Verificar user_profiles
SELECT id, organization_id, role, full_name, created_at
FROM user_profiles
WHERE id = 'b897a957-9046-4416-af32-992c71a271b4';

-- 3. Verificar organizations
SELECT id, name, slug, plan, created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- 4. Ver todos los user_profiles
SELECT up.id, up.organization_id, up.role, up.full_name, o.name as org_name
FROM user_profiles up
LEFT JOIN organizations o ON o.id = up.organization_id
ORDER BY up.created_at DESC;
