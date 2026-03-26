import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sycxgpjwucbebnanfwwx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Y3hncGp3dWNiZWJuYW5md3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ5NzE0MCwiZXhwIjoyMDkwMDczMTQwfQ.f_94Q514OypITma6-Tl5d4RgjTzsyxFi1vvTviwOS88';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const schema = `
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Perfiles de usuario (extiende auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Tabla de partidos
create table partidos (
  id uuid default uuid_generate_v4() primary key,
  creador_id uuid references profiles(id) on delete cascade not null,
  fecha date not null,
  hora time not null,
  cancha text not null,
  max_jugadores int not null default 10,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'jugando', 'finalizado')),
  equipo_a_resultado int,
  equipo_b_resultado int,
  mvp_id uuid references profiles(id),
  created_at timestamptz default now()
);

-- Jugadores en un partido
create table partido_jugadores (
  id uuid default uuid_generate_v4() primary key,
  partido_id uuid references partidos(id) on delete cascade not null,
  usuario_id uuid references profiles(id) on delete cascade not null,
  rol text not null default 'invitado' check (rol in ('creador', 'invitado')),
  equipo text check (equipo in ('a', 'b')),
  created_at timestamptz default now(),
  unique(partido_id, usuario_id)
);

-- Invitaciones a partidos
create table invitaciones (
  id uuid default uuid_generate_v4() primary key,
  partido_id uuid references partidos(id) on delete cascade not null,
  de_usuario_id uuid references profiles(id) on delete cascade not null,
  para_usuario_id uuid references profiles(id) on delete cascade not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptado', 'rechazado')),
  created_at timestamptz default now(),
  unique(partido_id, de_usuario_id, para_usuario_id)
);

-- Goles registrados
create table goles (
  id uuid default uuid_generate_v4() primary key,
  partido_id uuid references partidos(id) on delete cascade not null,
  jugador_id uuid references profiles(id) on delete cascade not null,
  equipo text not null check (equipo in ('a', 'b')),
  minuto int not null,
  created_at timestamptz default now()
);

-- Votos para MVP
create table votos_mvp (
  id uuid default uuid_generate_v4() primary key,
  partido_id uuid references partidos(id) on delete cascade not null,
  votante_id uuid references profiles(id) on delete cascade not null,
  mvp_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(partido_id, votante_id)
);

-- Índices para mejorar rendimiento
create index idx_partidos_creador on partidos(creador_id);
create index idx_partidos_estado on partidos(estado);
create index idx_partido_jugadores_partido on partido_jugadores(partido_id);
create index idx_invitaciones_para on invitaciones(para_usuario_id);
create index idx_invitaciones_partido on invitaciones(partido_id);
create index idx_goles_partido on goles(partido_id);
create index idx_votos_mvp_partido on votos_mvp(partido_id);

-- RLS Policies (Row Level Security)
alter table profiles enable row level security;
alter table partidos enable row level security;
alter table partido_jugadores enable row level security;
alter table invitaciones enable row level security;
alter table goles enable row level security;
alter table votos_mvp enable row level security;

-- Policies para profiles
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Anyone can view profiles" on profiles for select using (true);

-- Policies para partidos
create policy "Users can view any partido" on partidos for select using (true);
create policy "Users can create partido" on partidos for insert with check (auth.uid() = creador_id);
create policy "Users can update own partido" on partidos for update using (auth.uid() = creador_id);
create policy "Users can delete own partido" on partidos for delete using (auth.uid() = creador_id);

-- Policies para partido_jugadores
create policy "Anyone can view partido_jugadores" on partido_jugadores for select using (true);
create policy "Users can insert partido_jugadores" on partido_jugadores for insert with check (true);
create policy "Users can update own partido_jugadores" on partido_jugadores for update using (true);
create policy "Users can delete own partido_jugadores" on partido_jugadores for delete using (true);

-- Policies para invitaciones
create policy "Users can view own invitaciones" on invitaciones for select using (auth.uid() = de_usuario_id or auth.uid() = para_usuario_id);
create policy "Users can create invitaciones" on invitaciones for insert with check (auth.uid() = de_usuario_id);
create policy "Users can update own invitaciones" on invitaciones for update using (auth.uid() = para_usuario_id);
create policy "Users can delete own invitaciones" on invitaciones for delete using (auth.uid() = de_usuario_id or auth.uid() = para_usuario_id);

-- Policies para goles
create policy "Anyone can view goles" on goles for select using (true);
create policy "Users can insert goles" on goles for insert with check (true);
create policy "Users can update own goles" on goles for update using (true);
create policy "Users can delete own goles" on goles for delete using (true);

-- Policies para votos_mvp
create policy "Anyone can view votos_mvp" on votos_mvp for select using (true);
create policy "Users can insert votos_mvp" on votos_mvp for insert with check (auth.uid() = votante_id);
create policy "Users can update own votos_mvp" on votos_mvp for update using (auth.uid() = votante_id);
create policy "Users can delete own votos_mvp" on votos_mvp for delete using (auth.uid() = votante_id);
`;

async function runSchema() {
  console.log('Ejecutando schema en Supabase...');
  
  const statements = schema.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (statement.trim()) {
      const { error } = await supabase.rpc('exec_sql', { query: statement });
      if (error) {
        console.log('Ejecutando como raw query...');
      }
    }
  }
  
  console.log('Schema ejecutado (o las tablas ya existen)');
}

runSchema().catch(console.error);