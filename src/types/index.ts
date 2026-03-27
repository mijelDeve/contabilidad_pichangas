export type PartidoEstado = 'pendiente' | 'confirmado' | 'jugando' | 'finalizado';
export type InvitacionEstado = 'pendiente' | 'aceptado' | 'rechazado';

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  rating: number;
  rating_inicial: number | null;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Partido {
  id: string;
  creador_id: string;
  fecha: string;
  hora: string;
  cancha: string;
  max_jugadores: number;
  estado: PartidoEstado;
  equipo_a_resultado: number | null;
  equipo_b_resultado: number | null;
  mvp_id: string | null;
  created_at: string;
}

export interface PartidoJugador {
  id: string;
  partido_id: string;
  usuario_id: string;
  rol: 'creador' | 'invitado';
  equipo: 'a' | 'b' | null;
  es_admin?: boolean;
  created_at: string;
}

export interface Invitacion {
  id: string;
  partido_id: string;
  de_usuario_id: string;
  para_usuario_id: string;
  estado: InvitacionEstado;
  created_at: string;
}

export interface Gol {
  id: string;
  partido_id: string;
  jugador_id: string;
  equipo: 'a' | 'b';
  minuto: number;
  created_at: string;
}

export interface VotoMvp {
  id: string;
  partido_id: string;
  votante_id: string;
  mvp_id: string;
  created_at: string;
}

export interface EstadisticasUsuario {
  usuario_id: string;
  partidos_jugados: number;
  partidos_ganados: number;
  goles_totales: number;
  mvp_totales: number;
  created_at: string;
  updated_at: string;
}

export interface PartidoWithRelations extends Partido {
  creador?: User;
  jugadores?: (PartidoJugador & { usuario?: User })[];
  invitaciones?: (Invitacion & { de_usuario?: User; para_usuario?: User })[];
  goles?: Gol[];
}