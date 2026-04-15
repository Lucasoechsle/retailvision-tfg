-- Agregar policy de INSERT para organizations
-- Ejecutar este SQL en Supabase SQL Editor

-- Permitir a usuarios autenticados crear su primera organización
CREATE POLICY "Users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (true);

-- Nota: Idealmente deberías agregar una validación para que un usuario
-- solo pueda crear UNA organización, pero para el MVP esto es suficiente.
-- En producción considera:
-- 1. Usar un API route para el registro que maneje toda la lógica server-side
-- 2. Agregar un check para verificar que el usuario no tenga ya una organización
