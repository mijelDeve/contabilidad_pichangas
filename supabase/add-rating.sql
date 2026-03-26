-- Agregar columnas de rating a la tabla profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating int DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rating_inicial int;

-- Tabla para historial de ratings
CREATE TABLE IF NOT EXISTS ratings_historico (
  id uuid default uuid_generate_v4() primary key,
  usuario_id uuid references profiles(id) on delete cascade not null,
  rating int not null,
  motivo text not null,
  partido_id uuid references partidos(id),
  created_at timestamptz default now()
);

-- Agregar índice para mejor rendimiento
create index idx_ratings_historico_usuario on ratings_historico(usuario_id);
create index idx_ratings_historico_fecha on ratings_historico(created_at desc);