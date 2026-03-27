-- Tabla para almacenar rankings de jugadores por partido
create table if not exists rankings (
  id uuid default uuid_generate_v4() primary key,
  partido_id uuid references partidos(id) on delete cascade not null,
  votante_id uuid references profiles(id) on delete cascade not null,
  jugador_id uuid references profiles(id) on delete cascade not null,
  tipo text not null check (tipo in ('propio', 'contrario')),
  posicion int not null,
  created_at timestamptz default now(),
  unique(partido_id, votante_id, tipo)
);

-- Índices
create index idx_rankings_partido on rankings(partido_id);
create index idx_rankings_votante on rankings(votante_id);

-- Agregar columna es_admin si no existe
alter table partido_jugadores add column if not exists es_admin boolean default false;
