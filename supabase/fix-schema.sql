-- Fix: Agregar columna 'cancha' a la tabla 'partidos'
-- Ejecuta este script en el SQL Editor de Supabase

-- 1. Verificar si existe la columna _cancha (el typo del schema original)
ALTER TABLE partidos RENAME COLUMN _cancha TO cancha;

-- 2. Si la columna no existe (error anterior), agregarla
-- ALTER TABLE partidos ADD COLUMN IF NOT EXISTS cancha text NOT NULL;

-- Verificar el resultado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'partidos';