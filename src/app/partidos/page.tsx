'use client';

import { useAuth } from '@/components/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Partido, Profile } from '@/types';
import { Search, Users, Calendar, Clock, ArrowLeft, Plus } from 'lucide-react';

interface PartidoWithCreator extends Partido {
  creador_username?: string;
  jugadores_count?: number;
}

export default function PartidosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [misPartidos, setMisPartidos] = useState<PartidoWithCreator[]>([]);
  const [partidosDisponibles, setPartidosDisponibles] = useState<PartidoWithCreator[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [uniendoId, setUniendoId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      loadPartidos();
    }
  }, [user, authLoading]);

  const loadPartidos = async () => {
    setLoadingData(true);
    
    // Obtener mis partidos (donde soy creador o estoy invitado/aceptado)
    const { data: misJugadorPartidos } = await supabase
      .from('partido_jugadores')
      .select('partido_id')
      .eq('usuario_id', user?.id);

    const misPartidoIds = misJugadorPartidos?.map((m: { partido_id: string }) => m.partido_id) || [];
    if (user) {
      misPartidoIds.push(user.id); // Para partidos que creé
    }

    const { data: misPartidosData } = await supabase
      .from('partidos')
      .select(`
        *,
        creador:profiles!partidos_creador_id_fkey(username),
        partido_jugadores(
          id,
          usuario_id,
          equipo
        )
      `)
      .in('id', misPartidoIds.length > 0 ? misPartidoIds : ['none'])
      .order('fecha', { ascending: true });

    if (misPartidosData) {
      setMisPartidos(misPartidosData.map((p: any) => ({
        ...p,
        creador_username: p.creador?.username,
        jugadores_count: p.partido_jugadores?.filter((j: any) => j.equipo).length || 0
      })));
    }

    // Obtener partidos disponibles (no soy creador, no estoy unido, estado pendiente/confirmado)
    const { data: disponiblesData } = await supabase
      .from('partidos')
      .select(`
        *,
        creador:profiles!partidos_creador_id_fkey(username),
        partido_jugadores(
          id,
          usuario_id,
          equipo
        )
      `)
      .in('estado', ['pendiente', 'confirmado'])
      .order('fecha', { ascending: true });

    if (disponiblesData && user) {
      const disponibles = disponiblesData.filter((p: any) => {
        const esCreador = p.creador_id === user.id;
        const yaUnido = p.partido_jugadores?.some((j: any) => j.usuario_id === user.id && j.equipo);
        return !esCreador && !yaUnido;
      }).map((p: any) => ({
        ...p,
        creador_username: p.creador?.username,
        jugadores_count: p.partido_jugadores?.filter((j: any) => j.equipo).length || 0
      }));
      setPartidosDisponibles(disponibles);
    }

    setLoadingData(false);
  };

  const unirseAPartido = async (partidoId: string) => {
    if (!user) return;
    
    // Verificar si ya está unido
    const { data: existente } = await supabase
      .from('partido_jugadores')
      .select('id')
      .eq('partido_id', partidoId)
      .eq('usuario_id', user.id)
      .single();

    if (existente) {
      alert('Ya estás unido a este partido');
      setUniendoId(null);
      return;
    }
    
    setUniendoId(partidoId);
    
    await supabase.from('partido_jugadores').insert({
      partido_id: partidoId,
      usuario_id: user.id,
      rol: 'invitado',
      equipo: null
    });

    setUniendoId(null);
    loadPartidos();
  };

  const filtrarPartidos = (partidos: PartidoWithCreator[]) => {
    if (!busqueda.trim()) return partidos;
    const search = busqueda.toLowerCase();
    return partidos.filter(p => 
      p.cancha.toLowerCase().includes(search) ||
      p.creador_username?.toLowerCase().includes(search)
    );
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user) return null;

  const misPartidosFiltrados = filtrarPartidos(misPartidos);
  const disponiblesFiltrados = filtrarPartidos(partidosDisponibles);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Buscar Partidos</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Buscador */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre de sala..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Mis Partidos */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" />
            Mis Partidos
          </h2>
          
          {misPartidosFiltrados.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              No tienes partidos inscritos
            </div>
          ) : (
            <div className="space-y-3">
              {misPartidosFiltrados.map((partido) => (
                <button
                  key={partido.id}
                  onClick={() => router.push(`/partido/${partido.id}`)}
                  className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{partido.cancha}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(partido.fecha).toLocaleDateString('es-CL', { 
                            weekday: 'short', day: 'numeric', month: 'short' 
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {partido.hora?.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {partido.jugadores_count}/{partido.max_jugadores}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      partido.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      partido.estado === 'confirmado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {partido.estado === 'pendiente' ? 'Por confirmar' :
                       partido.estado === 'confirmado' ? 'Confirmado' :
                       partido.estado === 'jugando' ? 'Jugando' : 'Finalizado'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Partidos Disponibles */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Partidos Disponibles
          </h2>
          
          {disponiblesFiltrados.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400">
              No hay partidos disponibles para unirse
            </div>
          ) : (
            <div className="space-y-3">
              {disponiblesFiltrados.map((partido) => (
                <div
                  key={partido.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{partido.cancha}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(partido.fecha).toLocaleDateString('es-CL', { 
                            weekday: 'short', day: 'numeric', month: 'short' 
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {partido.hora?.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {partido.jugadores_count}/{partido.max_jugadores}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Creado por {partido.creador_username}
                      </p>
                    </div>
                    <button
                      onClick={() => unirseAPartido(partido.id)}
                      disabled={uniendoId === partido.id || (partido.jugadores_count || 0) >= partido.max_jugadores}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${
                        (partido.jugadores_count || 0) >= partido.max_jugadores
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {uniendoId === partido.id ? 'Uniéndose...' : 
                       (partido.jugadores_count || 0) >= partido.max_jugadores ? 'Lleno' : 'Unirse'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón crear partido */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => router.push('/partido/nuevo')}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
          >
            <Plus className="w-5 h-5" />
            Crear Nuevo Partido
          </button>
        </div>
      </main>
    </div>
  );
}