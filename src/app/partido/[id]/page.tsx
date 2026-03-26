'use client';

import { useAuth } from '@/components/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Partido, Profile, PartidoJugador, Invitacion, Gol, VotoMvp } from '@/types';
import { ArrowLeft, Users, Calendar, Clock, Plus, Trophy, Send, Star, X, Check, Shuffle, RefreshCw } from 'lucide-react';

interface PartidoDetalle extends Partido {
  creador?: Profile;
  partido_jugadores?: (PartidoJugador & { usuario?: Profile })[];
  invitaciones?: (Invitacion & { de_usuario?: Profile; para_usuario?: Profile })[];
  goles?: (Gol & { jugador?: Profile })[];
  votos_mvp?: (VotoMvp & { votante?: Profile; mvp?: Profile })[];
}

export default function PartidoPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  
  const [partido, setPartido] = useState<PartidoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState<{id: string; username: string; avatar_url: string | null}[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarInvitacion, setMostrarInvitacion] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<'a' | 'b' | null>(null);
  const [minutoActual, setMinutoActual] = useState(0);
  const [equiposGenerados, setEquiposGenerados] = useState(false);
  const [generandoEquipos, setGenerandoEquipos] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && params.id) {
      loadPartido();
    }
  }, [user, params.id]);

  const loadPartido = async () => {
    const { data: partidoData } = await supabase
      .from('partidos')
      .select(`
        *,
        creador:profiles!partidos_creador_id_fkey(id, username, avatar_url),
        partido_jugadores(
          *,
          usuario:profiles!partido_jugadores_usuario_id_fkey(id, username, avatar_url, rating)
        ),
        invitaciones(
          *,
          de_usuario:profiles!invitaciones_de_usuario_id_fkey(id, username, avatar_url, rating),
          para_usuario:profiles!invitaciones_para_usuario_id_fkey(id, username, avatar_url, rating)
        ),
        goles(
          *,
          jugador:profiles!goles_jugador_id_fkey(id, username, avatar_url, rating)
        ),
        votos_mvp(
          *,
          votante:profiles!votos_mvp_votante_id_fkey(id, username, avatar_url, rating),
          mvp:profiles!votos_mvp_mvp_id_fkey(id, username, avatar_url, rating)
        )
      `)
      .eq('id', params.id)
      .single();

    if (partidoData) {
      setPartido(partidoData);
      if (partidoData.goles && partidoData.goles.length > 0) {
        const ultimoMinuto = Math.max(...partidoData.goles.map((g: Gol) => g.minuto));
        setMinutoActual(ultimoMinuto);
      }
    }
    setLoading(false);
  };

  const buscarUsuarios = async () => {
    if (!busqueda.trim()) return;
    setBuscando(true);
    
    const searchTerm = busqueda.trim().toLowerCase();
    
    const { data: byUsername } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${searchTerm}%`)
      .neq('id', user?.id)
      .limit(15);

    setResultadosBusqueda(byUsername || []);
    setBuscando(false);
  };

  const invitarJugador = async (jugadorId: string) => {
    if (!partido) return;
    setBuscando(true);
    
    await supabase.from('invitaciones').insert({
      partido_id: partido.id,
      de_usuario_id: user?.id,
      para_usuario_id: jugadorId,
      estado: 'pendiente'
    });
    
    setMostrarInvitacion(false);
    setBusqueda('');
    setResultadosBusqueda([]);
    loadPartido();
    setBuscando(false);
  };

  const iniciarPartido = async () => {
    if (!partido) return;
    await supabase
      .from('partidos')
      .update({ estado: 'jugando' })
      .eq('id', partido.id);
    loadPartido();
  };

  const registrarGol = async (jugadorId: string, equipo: 'a' | 'b') => {
    if (!partido) return;
    
    const nuevoMinuto = minutoActual + 1;
    
    await supabase.from('goles').insert({
      partido_id: partido.id,
      jugador_id: jugadorId,
      equipo: equipo,
      minuto: nuevoMinuto
    });
    
    setMinutoActual(nuevoMinuto);
    setEquipoSeleccionado(null);
    loadPartido();
  };

  const registrarResultado = async (equipoA: number, equipoB: number) => {
    if (!partido) return;
    
    const ganoA = equipoA > equipoB;
    const ganoB = equipoB > equipoA;
    const empato = equipoA === equipoB;
    
    await supabase
      .from('partidos')
      .update({ 
        equipo_a_resultado: equipoA,
        equipo_b_resultado: equipoB,
        estado: 'finalizado'
      })
      .eq('id', partido.id);

    const todosJugadores = [...jugadoresEquipoA, ...jugadoresEquipoB];
    
    for (const jugador of todosJugadores) {
      const esEquipoA = jugador.equipo === 'a';
      const gano = esEquipoA ? ganoA : ganoB;
      
      const { data: perfil } = await supabase
        .from('profiles')
        .select('rating')
        .eq('id', jugador.usuario_id)
        .single();
      
      if (perfil) {
        let nuevoRating = perfil.rating;
        
        if (gano) nuevoRating += 2;
        else if (!empato) nuevoRating -= 1;
        
        const mvpDelPartido = partido.mvp_id === jugador.usuario_id;
        if (mvpDelPartido) nuevoRating += 3;
        
        const misGoles = partido.goles?.filter(g => g.jugador_id === jugador.usuario_id).length || 0;
        nuevoRating += misGoles * 0.5;
        
        nuevoRating = Math.max(40, Math.min(99, nuevoRating));
        
        await supabase
          .from('profiles')
          .update({ rating: nuevoRating })
          .eq('id', jugador.usuario_id);
        
        await supabase.from('ratings_historico').insert({
          usuario_id: jugador.usuario_id,
          rating: nuevoRating,
          motivo: mvpDelPartido ? 'partido_mvp' : 'partido',
          partido_id: partido.id
        });
      }
    }
    
    loadPartido();
  };

  const votarMvp = async (mvpId: string) => {
    if (!partido || !user) return;
    
    const existente = await supabase
      .from('votos_mvp')
      .select('id')
      .eq('partido_id', partido.id)
      .eq('votante_id', user.id)
      .single();

    if (existente.data) {
      await supabase
        .from('votos_mvp')
        .update({ mvp_id: mvpId })
        .eq('id', existente.data.id);
    } else {
      await supabase.from('votos_mvp').insert({
        partido_id: partido.id,
        votante_id: user.id,
        mvp_id: mvpId
      });
    }
    loadPartido();
  };

  // Función para generar equipos con Draft Alternado (balanceado por rating)
  const generarEquiposDraftAlternado = async () => {
    if (!partido || !esCreador) return;
    
    setGenerandoEquipos(true);
    
    // Obtener jugadores sin equipo con sus ratings
    const jugadoresSinEquipoConRating = partido.partido_jugadores
      ?.filter(j => j.usuario && !j.equipo && j.usuario.rating)
      .map(j => ({
        id: j.id,
        usuarioId: j.usuario_id!,
        username: j.usuario!.username,
        rating: j.usuario!.rating || 50
      })) || [];

    if (jugadoresSinEquipoConRating.length < 2) {
      setGenerandoEquipos(false);
      return;
    }

    // Ordenar por rating (mayor a menor)
    const ordenados = [...jugadoresSinEquipoConRating].sort((a, b) => b.rating - a.rating);

    // Asignar alternadamente: A, B, B, A, A, B...
    const updates: { id: string; equipo: 'a' | 'b' }[] = [];
    
    ordenados.forEach((jugador, index) => {
      // Patrón: A, B, B, A, A, B... (para balancear equipos)
      const pattern = index % 4;
      const equipo = (pattern === 0 || pattern === 3) ? 'a' : 'b';
      updates.push({ id: jugador.id, equipo });
    });

    // Actualizar todos los equipos en paralelo
    await Promise.all(updates.map(u => 
      supabase.from('partido_jugadores').update({ equipo: u.equipo }).eq('id', u.id)
    ));

    setEquiposGenerados(true);
    setGenerandoEquipos(false);
    loadPartido();
  };

  // Función para generar equipos por Niveles (top 50% vs bottom 50%)
  const generarEquiposPorNiveles = async () => {
    if (!partido || !esCreador) return;
    
    setGenerandoEquipos(true);
    
    // Obtener jugadores sin equipo con sus ratings
    const jugadoresSinEquipoConRating = partido.partido_jugadores
      ?.filter(j => j.usuario && !j.equipo && j.usuario.rating)
      .map(j => ({
        id: j.id,
        usuarioId: j.usuario_id!,
        username: j.usuario!.username,
        rating: j.usuario!.rating || 50
      })) || [];

    if (jugadoresSinEquipoConRating.length < 2) {
      setGenerandoEquipos(false);
      return;
    }

    // Ordenar por rating
    const ordenados = [...jugadoresSinEquipoConRating].sort((a, b) => b.rating - a.rating);

    // Separar en dos grupos: top 50% y bottom 50%
    const mid = Math.floor(ordenados.length / 2);
    const topHalf = ordenados.slice(0, mid);
    const bottomHalf = ordenados.slice(mid);

    // Shuffle cada grupo
    const shuffle = (arr: typeof topHalf) => arr.sort(() => Math.random() - 0.5);
    const topShuffled = shuffle([...topHalf]);
    const bottomShuffled = shuffle([...bottomHalf]);

    // Asignar: mitad de cada grupo a cada equipo
    const updates: { id: string; equipo: 'a' | 'b' }[] = [];
    
    // Equipo A: primera mitad del top + primera mitad del bottom
    for (let i = 0; i < Math.ceil(topShuffled.length / 2); i++) {
      updates.push({ id: topShuffled[i].id, equipo: 'a' });
    }
    for (let i = 0; i < Math.ceil(bottomShuffled.length / 2); i++) {
      updates.push({ id: bottomShuffled[i].id, equipo: 'a' });
    }
    
    // Equipo B: resto
    for (let i = Math.ceil(topShuffled.length / 2); i < topShuffled.length; i++) {
      updates.push({ id: topShuffled[i].id, equipo: 'b' });
    }
    for (let i = Math.ceil(bottomShuffled.length / 2); i < bottomShuffled.length; i++) {
      updates.push({ id: bottomShuffled[i].id, equipo: 'b' });
    }

    // Actualizar todos los equipos en paralelo
    await Promise.all(updates.map(u => 
      supabase.from('partido_jugadores').update({ equipo: u.equipo }).eq('id', u.id)
    ));

    setEquiposGenerados(true);
    setGenerandoEquipos(false);
    loadPartido();
  };

  // Función para resetear equipos y generar de nuevo (para modo Por Niveles)
  const resetearYRegenerarEquipos = async () => {
    if (!partido || !esCreador) return;
    
    // Primero resetear todos los jugadores sin equipo
    const jugadoresSinEquipo = partido.partido_jugadores?.filter(j => j.usuario && !j.equipo) || [];
    
    await Promise.all(jugadoresSinEquipo.map(j => 
      supabase.from('partido_jugadores').update({ equipo: null }).eq('id', j.id)
    ));

    // Luego generar nuevos equipos por niveles
    await generarEquiposPorNiveles();
  };

  const esCreador = partido?.creador_id === user?.id;
  const jugadoresEquipoA = partido?.partido_jugadores?.filter(j => j.usuario && j.equipo === 'a') || [];
  const jugadoresEquipoB = partido?.partido_jugadores?.filter(j => j.usuario && j.equipo === 'b') || [];
  const jugadoresSinEquipo = partido?.partido_jugadores?.filter(j => j.usuario && !j.equipo) || [];
  const invitacionesPendientes = partido?.invitaciones?.filter(i => i.estado === 'pendiente') || [];
  const golesEquipoA = partido?.goles?.filter(g => g.equipo === 'a') || [];
  const golesEquipoB = partido?.goles?.filter(g => g.equipo === 'b') || [];
  const misVotos = partido?.votos_mvp?.filter(v => v.votante_id === user?.id) || [];

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!partido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Partido no encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            partido.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
            partido.estado === 'jugando' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {partido.estado === 'pendiente' ? 'Por confirmar' :
             partido.estado === 'jugando' ? 'Jugando' : 'Finalizado'}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{partido.cancha}</h1>
          <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {new Date(partido.fecha).toLocaleDateString('es-CL', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
              })}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {partido.hora.slice(0, 5)}
            </span>
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {(jugadoresEquipoA.length + jugadoresEquipoB.length)}/{partido.max_jugadores} jugadores
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Creado por {partido.creador?.username}
          </p>
        </div>

        {partido.estado === 'jugando' && esCreador && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border-2 border-green-200 dark:border-green-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-green-700 dark:text-green-400">Equipo A</h2>
                <span className="text-4xl font-bold text-green-600 dark:text-green-400">{golesEquipoA.length}</span>
              </div>
              <button
                onClick={() => setEquipoSeleccionado('a')}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Registrar Gol
              </button>
              {jugadoresEquipoA.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Jugadores:</p>
                  {jugadoresEquipoA.map(j => (
                    <div key={j.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="w-6 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <span className="text-green-700 dark:text-green-400 text-xs font-bold">{j.usuario?.username?.charAt(0).toUpperCase()}</span>
                      </div>
                      {j.usuario?.username}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400">Equipo B</h2>
                <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{golesEquipoB.length}</span>
              </div>
              <button
                onClick={() => setEquipoSeleccionado('b')}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Registrar Gol
              </button>
              {jugadoresEquipoB.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Jugadores:</p>
                  {jugadoresEquipoB.map(j => (
                    <div key={j.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 dark:text-blue-400 text-xs font-bold">{j.usuario?.username?.charAt(0).toUpperCase()}</span>
                      </div>
                      {j.usuario?.username}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {partido.estado === 'jugando' && !esCreador && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-center">
            <p className="text-yellow-800 dark:text-yellow-200">Solo el creador del partido puede registrar goles</p>
          </div>
        )}

        {partido.estado === 'jugando' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Goles del Partido</h3>
            {partido.goles && partido.goles.length > 0 ? (
              <div className="space-y-2">
                {partido.goles.sort((a, b) => a.minuto - b.minuto).map(gol => (
                  <div key={gol.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-sm font-bold ${gol.equipo === 'a' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {gol.equipo.toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">{gol.jugador?.username}</span>
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">Minuto {gol.minuto}'</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">Aún no hay goles registrados</p>
            )}
          </div>
        )}

        {partido.estado === 'jugando' && esCreador && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Terminar Partido</h3>
            </div>
            <div className="flex items-center justify-center gap-8 text-3xl font-bold mb-4">
              <div className="text-center">
                <div className="text-green-600 dark:text-green-400 text-sm mb-1">Equipo A</div>
                <div className="text-4xl">{golesEquipoA.length}</div>
              </div>
              <span className="text-gray-400">-</span>
              <div className="text-center">
                <div className="text-blue-600 dark:text-blue-400 text-sm mb-1">Equipo B</div>
                <div className="text-4xl">{golesEquipoB.length}</div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
              El resultado se calcula automáticamente según los goles registrados
            </p>
            <button
              onClick={() => registrarResultado(golesEquipoA.length, golesEquipoB.length)}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-lg"
            >
              Finalizar Partido
            </button>
          </div>
        )}

        {partido.estado === 'finalizado' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resultado Final</h2>
              {partido.mvp_id && (
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                  <Trophy className="w-5 h-5" />
                  <span className="font-medium">MVP: {partido.votos_mvp?.find(v => v.mvp_id === partido.mvp_id)?.mvp?.username}</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-8 text-4xl font-bold">
              <div className="text-center">
                <div className="text-gray-400 dark:text-gray-500 text-sm mb-1">Equipo A</div>
                <div className={`${partido.equipo_a_resultado! > partido.equipo_b_resultado! ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {partido.equipo_a_resultado}
                </div>
              </div>
              <div className="text-gray-300 dark:text-gray-600">-</div>
              <div className="text-center">
                <div className="text-gray-400 dark:text-gray-500 text-sm mb-1">Equipo B</div>
                <div className={`${partido.equipo_b_resultado! > partido.equipo_a_resultado! ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  {partido.equipo_b_resultado}
                </div>
              </div>
            </div>
          </div>
        )}

        {partido.estado === 'finalizado' && !partido.mvp_id && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              <Star className="w-5 h-5 inline mr-2 text-yellow-500" />
              Votar MVP
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">¿Quién fue el mejor jugador del partido?</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...jugadoresEquipoA, ...jugadoresEquipoB].map(j => (
                <button
                  key={j.id}
                  onClick={() => votarMvp(j.usuario_id)}
                  disabled={misVotos.length > 0}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    misVotos.some(v => v.mvp_id === j.usuario_id)
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-600'
                  } text-gray-900 dark:text-white`}
                >
                  {j.usuario?.username}
                </button>
              ))}
            </div>
            {misVotos.length > 0 && (
              <p className="mt-3 text-sm text-green-600 dark:text-green-400">¡Voto registrado!</p>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <Users className="w-5 h-5 inline mr-2" />
              Jugadores
            </h2>
            {esCreador && partido.estado !== 'finalizado' && (
              <button
                onClick={() => setMostrarInvitacion(!mostrarInvitacion)}
                className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              >
                <Plus className="w-5 h-5" />
                Invitar
              </button>
            )}
          </div>

          {mostrarInvitacion && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarUsuarios()}
                  placeholder="Buscar jugador por nombre..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                />
                <button
                  onClick={buscarUsuarios}
                  disabled={buscando}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {resultadosBusqueda.length > 0 && (
                <div className="mt-3 space-y-2">
                  {resultadosBusqueda.map(u => (
                    <button
                      key={u.id}
                      onClick={() => invitarJugador(u.id)}
                      disabled={buscando || invitacionesPendientes.some(i => i.para_usuario_id === u.id)}
                      className="w-full flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 text-gray-900 dark:text-white"
                    >
                      <span>{u.username}</span>
                      {invitacionesPendientes.some(i => i.para_usuario_id === u.id) ? (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">Ya invitado</span>
                      ) : (
                        <Plus className="w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {jugadoresSinEquipo.length > 1 && esCreador && (
            <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-3">Generar Equipos Balanceados:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={generarEquiposDraftAlternado}
                  disabled={generandoEquipos}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium text-sm"
                >
                  <Shuffle className="w-4 h-4" />
                  Draft Alternado
                </button>
                <button
                  onClick={generarEquiposPorNiveles}
                  disabled={generandoEquipos}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium text-sm"
                >
                  <Users className="w-4 h-4" />
                  Por Niveles
                </button>
                {equiposGenerados && (
                  <button
                    onClick={resetearYRegenerarEquipos}
                    disabled={generandoEquipos}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerar
                  </button>
                )}
              </div>
              {generandoEquipos && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">Generando equipos...</p>
              )}
            </div>
          )}

          {jugadoresSinEquipo.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">Sin equipo asignado:</p>
              <div className="flex flex-wrap gap-2">
                {esCreador ? (
                  jugadoresSinEquipo.map(j => (
                    <div key={j.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 rounded-lg p-2">
                      <span className="text-gray-900 dark:text-white text-sm">{j.usuario?.username}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={async () => {
                            await supabase.from('partido_jugadores').update({ equipo: 'a' }).eq('id', j.id);
                            loadPartido();
                          }}
                          className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800 rounded font-medium"
                        >
                          Equipo A
                        </button>
                        <button
                          onClick={async () => {
                            await supabase.from('partido_jugadores').update({ equipo: 'b' }).eq('id', j.id);
                            loadPartido();
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded font-medium"
                        >
                          Equipo B
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  jugadoresSinEquipo.map(j => (
                    <span key={j.id} className="text-sm text-gray-600 dark:text-gray-400">{j.usuario?.username}</span>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Equipo A ({jugadoresEquipoA.length})</h3>
              {jugadoresEquipoA.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Sin jugadores</p>
              ) : (
                <div className="space-y-2">
                  {jugadoresEquipoA.map(j => (
                    <div key={j.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                          <span className="text-green-700 dark:text-green-400 text-xs font-bold">{j.usuario?.username?.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-gray-900 dark:text-white text-sm">{j.usuario?.username}</span>
                        {j.usuario?.rating && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">⭐{j.usuario.rating}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {j.rol === 'creador' && (
                          <span className="text-xs bg-green-200 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">Creador</span>
                        )}
                        {esCreador && j.rol !== 'creador' && (
                          <button
                            onClick={async () => {
                              await supabase.from('partido_jugadores').update({ equipo: null }).eq('id', j.id);
                              loadPartido();
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Equipo B ({jugadoresEquipoB.length})</h3>
              {jugadoresEquipoB.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Sin jugadores</p>
              ) : (
                <div className="space-y-2">
                  {jugadoresEquipoB.map(j => (
                    <div key={j.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 dark:text-blue-400 text-xs font-bold">{j.usuario?.username?.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-gray-900 dark:text-white text-sm">{j.usuario?.username}</span>
                        {j.usuario?.rating && (
                          <span className="text-xs text-yellow-600 dark:text-yellow-400">⭐{j.usuario.rating}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {j.rol === 'creador' && (
                          <span className="text-xs bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded">Creador</span>
                        )}
                        {esCreador && j.rol !== 'creador' && (
                          <button
                            onClick={async () => {
                              await supabase.from('partido_jugadores').update({ equipo: null }).eq('id', j.id);
                              loadPartido();
                            }}
                            className="text-xs text-red-600 dark:text-red-400 hover:underline"
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {invitacionesPendientes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invitaciones Pendientes</h2>
            <div className="space-y-2">
              {invitacionesPendientes.map(i => (
                <div key={i.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-900 dark:text-white">{i.para_usuario?.username}</span>
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">Pendiente</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {esCreador && partido.estado === 'pendiente' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={iniciarPartido}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Iniciar Partido
            </button>
          </div>
        )}
      </main>

      {equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                ¿Quién marcó el gol?
              </h3>
              <button
                onClick={() => setEquipoSeleccionado(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Minuto: {minutoActual + 1}'
            </p>
            <div className="space-y-2">
              {(equipoSeleccionado === 'a' ? jugadoresEquipoA : jugadoresEquipoB).length > 0 ? (
                (equipoSeleccionado === 'a' ? jugadoresEquipoA : jugadoresEquipoB).map(j => (
                  <button
                    key={j.id}
                    onClick={() => registrarGol(j.usuario_id!, equipoSeleccionado)}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      equipoSeleccionado === 'a' ? 'bg-green-200 dark:bg-green-800' : 'bg-blue-200 dark:bg-blue-800'
                    }`}>
                      <span className={`font-bold ${
                        equipoSeleccionado === 'a' ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'
                      }`}>
                        {j.usuario?.username?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">{j.usuario?.username}</span>
                    <Check className={`ml-auto w-5 h-5 ${
                      equipoSeleccionado === 'a' ? 'text-green-600' : 'text-blue-600'
                    }`} />
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  No hay jugadores en este equipo
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}