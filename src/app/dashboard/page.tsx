'use client';

import { useAuth } from '@/components/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { Partido, Invitacion, Profile } from '@/types';
import { Plus, Calendar, Users, LogOut, Trophy, Clock, User } from 'lucide-react';

interface PartidoWithCreador extends Partido {
  creador_username?: string;
}

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [partidos, setPartidos] = useState<PartidoWithCreador[]>([]);
  const [invitaciones, setInvitaciones] = useState<(Invitacion & { partido?: Partido; de_usuario?: Profile })[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    
    setLoadingData(true);
    
    const { data: partidoIds } = await supabase
      .from('invitaciones')
      .select('partido_id')
      .eq('para_usuario_id', user.id)
      .eq('estado', 'aceptado');

    const idsFromInvitations = partidoIds?.map((i: { partido_id: string }) => i.partido_id) || [];
    
    let query = supabase
      .from('partidos')
      .select(`
        *,
        creador:profiles!partidos_creador_id_fkey(username)
      `)
      .in('estado', ['pendiente', 'confirmado', 'jugando'])
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });

    if (idsFromInvitations.length > 0) {
      query = query.or(`creador_id.eq.${user.id},id.in.(${idsFromInvitations.join(',')})`);
    } else {
      query = query.eq('creador_id', user.id);
    }

    const { data: partidosData } = await query;

    if (partidosData) {
      setPartidos(partidosData.map((p: any) => ({
        ...p,
        creador_username: p.creador?.username
      })));
    }

    const { data: invitacionesData } = await supabase
      .from('invitaciones')
      .select(`
        *,
        partido:partidos(*),
        de_usuario:profiles!invitaciones_de_usuario_id_fkey(username)
      `)
      .eq('para_usuario_id', user.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    if (invitacionesData) {
      setInvitaciones(invitacionesData.map((i: any) => ({
        ...i,
        de_usuario: i.de_usuario
      })));
    }

    setLoadingData(false);
  }, [user, supabase]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !loading) {
      loadData();
    }
  }, [user, loading, loadData]);

  const aceptarInvitacion = async (invitacionId: string) => {
    const partidoId = invitaciones.find(i => i.id === invitacionId)?.partido_id;
    
    await supabase
      .from('invitaciones')
      .update({ estado: 'aceptado' })
      .eq('id', invitacionId);

    if (partidoId && user) {
      await supabase.from('partido_jugadores').insert({
        partido_id: partidoId,
        usuario_id: user.id,
        rol: 'invitado',
        equipo: null
      });
    }

    loadData();
  };

  const rechazarInvitacion = async (invitacionId: string) => {
    await supabase
      .from('invitaciones')
      .update({ estado: 'rechazado' })
      .eq('id', invitacionId);
    
    loadData();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">Pichangas</h1>
          <div className="flex items-center gap-4">
            {user && <NotificationBell userId={user.id} />}
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.username} className="w-12 h-12 rounded-full" />
          ) : (
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Hola, {profile?.username}</h2>
              {profile?.rating && (
                <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-bold rounded">
                  ⭐ {profile.rating}
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400">¿Qué vamos a jugar hoy?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => router.push('/partido/nuevo')}
            className="flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            <Plus className="w-6 h-6" />
            Crear Pichanga
          </button>
          <button
            onClick={() => router.push('/ranking')}
            className="flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border-2 border-yellow-400 dark:border-yellow-500 hover:border-yellow-500 text-gray-700 dark:text-gray-200 font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            <Trophy className="w-6 h-6 text-yellow-500" />
            Ranking
          </button>
          <button
            onClick={() => router.push('/mis-estadisticas')}
            className="flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-4 px-6 rounded-xl transition-colors"
          >
            <Trophy className="w-6 h-6" />
            Mis Estadísticas
          </button>
        </div>

        {invitaciones.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invitaciones Pendientes</h3>
            <div className="space-y-3">
              {invitaciones.map((invitacion) => (
                <div key={invitacion.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {invitacion.partido?.cancha}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(invitacion.partido?.fecha || '').toLocaleDateString('es-CL', { 
                            weekday: 'short', day: 'numeric', month: 'short' 
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {invitacion.partido?.hora?.slice(0, 5)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Invitado por {invitacion.de_usuario?.username}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => aceptarInvitacion(invitacion.id)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => rechazarInvitacion(invitacion.id)}
                        className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Próximos Partidos</h3>
          {partidos.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No hay partidos programados</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Crea uno nuevo para empezar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {partidos.map((partido) => (
                <button
                  key={partido.id}
                  onClick={() => router.push(`/partido/${partido.id}`)}
                  className="w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 rounded-xl p-4 transition-colors"
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
                          {partido.hora.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {partido.max_jugadores}
                        </span>
                      </div>
                      {partido.creador_id !== user?.id && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                          Creado por {partido.creador_username}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      partido.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      partido.estado === 'confirmado' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      partido.estado === 'jugando' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
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
      </main>
    </div>
  );
}