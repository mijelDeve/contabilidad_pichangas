'use client';

import { useAuth } from '@/components/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Trophy, Target, Star, Users, Eye, X } from 'lucide-react';

interface Estadisticas {
  total_partidos: number;
  partidos_ganados: number;
  partidos_perdidos: number;
  partidos_empatados: number;
  total_goles: number;
  total_mvp: number;
}

interface PartidoReciente {
  id: string;
  cancha: string;
  fecha: string;
  resultado_a: number;
  resultado_b: number;
  mvp_id: string | null;
  equipo: 'a' | 'b' | null;
  estado: string;
}

interface DetallePartido {
  id: string;
  cancha: string;
  fecha: string;
  equipo_a_resultado: number;
  equipo_b_resultado: number;
  mvp_id: string | null;
  creador?: { username: string };
  partido_jugadores?: Array<{
    id: string;
    usuario_id: string;
    equipo: string | null;
    usuario?: { id: string; username: string };
  }>;
  goles?: Array<{
    id: string;
    minuto: number;
    equipo: string;
    jugador?: { id: string; username: string };
  }>;
  votos_mvp?: Array<{
    mvp_id: string;
    mvp?: { username: string };
  }>;
}

export default function MisEstadisticasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [partidosRecientes, setPartidosRecientes] = useState<PartidoReciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [detallePartido, setDetallePartido] = useState<DetallePartido | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadEstadisticas();
    }
  }, [user]);

  const loadEstadisticas = async () => {
    setLoading(true);
    
    const { data: partidos } = await supabase
      .from('partido_jugadores')
      .select('partido_id, equipo, partido:partidos(id, fecha, cancha, equipo_a_resultado, equipo_b_resultado, mvp_id, estado)')
      .eq('usuario_id', user?.id);
    
    if (partidos && partidos.length > 0) {
      const filtrados = partidos.filter((p: any) => p.partido && (p.partido as any).estado === 'finalizado');
      
      let ganados = 0, perdidos = 0, empatados = 0, mvp = 0;
      
      for (const p of filtrados) {
        const partido = p.partido as any;
        const miEquipo = p.equipo;
        const resultadoA = partido.equipo_a_resultado || 0;
        const resultadoB = partido.equipo_b_resultado || 0;
        
        if (miEquipo === 'a') {
          if (resultadoA > resultadoB) ganados++;
          else if (resultadoA < resultadoB) perdidos++;
          else empatados++;
        } else if (miEquipo === 'b') {
          if (resultadoB > resultadoA) ganados++;
          else if (resultadoB < resultadoA) perdidos++;
          else empatados++;
        }
        
        if (partido.mvp_id === user?.id) mvp++;
      }
      
      const { data: golesData } = await supabase.from('goles').select('id').eq('jugador_id', user?.id);
      
      setEstadisticas({
        total_partidos: filtrados.length,
        partidos_ganados: ganados,
        partidos_perdidos: perdidos,
        partidos_empatados: empatados,
        total_goles: golesData?.length || 0,
        total_mvp: mvp
      });
      
      setPartidosRecientes(filtrados.slice(0, 10).map((p: any) => ({
        id: p.partido.id,
        cancha: p.partido.cancha,
        fecha: p.partido.fecha,
        resultado_a: p.partido.equipo_a_resultado || 0,
        resultado_b: p.partido.equipo_b_resultado || 0,
        mvp_id: p.partido.mvp_id,
        equipo: p.equipo,
        estado: p.partido.estado
      })));
    } else {
      setEstadisticas({
        total_partidos: 0,
        partidos_ganados: 0,
        partidos_perdidos: 0,
        partidos_empatados: 0,
        total_goles: 0,
        total_mvp: 0
      });
    }
    
    setLoading(false);
  };

  const verDetalle = async (partidoId: string) => {
    const { data } = await supabase
      .from('partidos')
      .select(`
        id, cancha, fecha, equipo_a_resultado, equipo_b_resultado, mvp_id,
        creador:profiles!partidos_creador_id_fkey(username),
        partido_jugadores(
          id, usuario_id, equipo,
          usuario:profiles!partido_jugadores_usuario_id_fkey(id, username)
        ),
        goles(
          id, minuto, equipo,
          jugador:profiles!goles_jugador_id_fkey(id, username)
        ),
        votos_mvp(
          mvp_id,
          mvp:profiles!votos_mvp_mvp_id_fkey(username)
        )
      `)
      .eq('id', partidoId)
      .single();
    
    if (data) setDetallePartido(data);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  const winRate = estadisticas && estadisticas.total_partidos > 0 
    ? Math.round((estadisticas.partidos_ganados / estadisticas.total_partidos) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            ← Volver
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mis Estadísticas</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <Users className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{estadisticas?.total_partidos || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Partidos Jugados</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{estadisticas?.partidos_ganados || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Partidos Ganados</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{winRate}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">% Victoria</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <Target className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{estadisticas?.total_goles || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Goles Totales</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <Star className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{estadisticas?.total_mvp || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Veces MVP</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
            <div className="text-3xl font-bold text-gray-400 dark:text-gray-500">{estadisticas?.partidos_empatados || 0}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Empates</div>
          </div>
        </div>

        {estadisticas && estadisticas.total_partidos > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Historial de Partidos</h2>
            <div className="space-y-3">
              {partidosRecientes.map(partido => {
                const miResultado = partido.equipo === 'a' ? partido.resultado_a : partido.resultado_b;
                const resultadoContrario = partido.equipo === 'a' ? partido.resultado_b : partido.resultado_a;
                const gano = miResultado > resultadoContrario;
                const empato = miResultado === resultadoContrario;
                
                return (
                  <div key={partido.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{partido.cancha}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(partido.fecha).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={`text-lg font-bold ${gano ? 'text-green-600 dark:text-green-400' : empato ? 'text-gray-600 dark:text-gray-400' : 'text-red-600 dark:text-red-400'}`}>
                          {partido.resultado_a} - {partido.resultado_b}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {gano ? 'Victoria' : empato ? 'Empate' : 'Derrota'}
                        </p>
                      </div>
                      {partido.mvp_id === user?.id && <Star className="w-5 h-5 text-yellow-500" />}
                      <button onClick={() => verDetalle(partido.id)} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg">
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!estadisticas || estadisticas.total_partidos === 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Trophy className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Aún no has participado en ningún partido</p>
            <button onClick={() => router.push('/partido/nuevo')} className="mt-4 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-medium">
              Crear tu primera pichanga →
            </button>
          </div>
        )}
      </main>

      {detallePartido && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{detallePartido.cancha}</h3>
              <button onClick={() => setDetallePartido(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-3xl font-bold">
                  <span className="text-green-600 dark:text-green-400">{detallePartido.equipo_a_resultado}</span>
                  <span className="text-gray-400 mx-2">-</span>
                  <span className="text-blue-600 dark:text-blue-400">{detallePartido.equipo_b_resultado}</span>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(detallePartido.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {detallePartido.mvp_id && (
                <div className="flex items-center justify-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <span className="font-medium text-yellow-800 dark:text-yellow-200">
                    MVP: {detallePartido.votos_mvp?.find(v => v.mvp_id === detallePartido.mvp_id)?.mvp?.username}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">Equipo A</h4>
                  <div className="space-y-1">
                    {detallePartido.partido_jugadores?.filter((j: any) => j.equipo === 'a').map((j: any) => (
                      <div key={j.id} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                          <span className="text-green-700 dark:text-green-400 text-xs">{j.usuario?.username?.charAt(0)}</span>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{j.usuario?.username}</span>
                        {j.usuario_id === user?.id && <span className="text-xs text-gray-400">(tú)</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Equipo B</h4>
                  <div className="space-y-1">
                    {detallePartido.partido_jugadores?.filter((j: any) => j.equipo === 'b').map((j: any) => (
                      <div key={j.id} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 dark:text-blue-400 text-xs">{j.usuario?.username?.charAt(0)}</span>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{j.usuario?.username}</span>
                        {j.usuario_id === user?.id && <span className="text-xs text-gray-400">(tú)</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {detallePartido.goles && detallePartido.goles.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Goles</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {detallePartido.goles.sort((a: any, b: any) => a.minuto - b.minuto).map((gol: any) => (
                      <div key={gol.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${gol.equipo === 'a' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {gol.equipo.toUpperCase()}
                          </span>
                          <span className="text-gray-900 dark:text-white">{gol.jugador?.username}</span>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">{gol.minuto}'</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => setDetallePartido(null)} className="mt-4 w-full py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}