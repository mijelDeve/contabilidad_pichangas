-- Agregar columna es_admin a partido_jugadores
ALTER TABLE partido_jugadores ADD COLUMN IF NOT EXISTS es_admin boolean DEFAULT false;

-- Hacer que el creador sea automáticamente admin
UPDATE partido_jugadores 
SET es_admin = true 
WHERE rol = 'creador';
