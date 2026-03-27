'use client';

import { useAuth } from '@/components/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';
import { Trophy, User, TrendingUp, ArrowLeft } from 'lucide-react';

interface PlayerRanking extends Profile {
  posicion: number;
}

export default function RankingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [jugadores, setJugadores] = useState<PlayerRanking[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Load ranking data
  useEffect(() => {
    const loadRanking = async () => {
      setLoadingData(true);
      
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, rating, rating_inicial, created_at')
        .order('rating', { ascending: false })
        .limit(20);

      if (data) {
        setJugadores(data.map((p: any, index: number) => ({
          ...p,
          posicion: index + 1
        })));
      }
      
      setLoadingData(false);
    };

    loadRanking();
  }, [supabase]);

  // Redirect if not logged in (only after auth is loaded)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const getMedalla = (posicion: number) => {
    if (posicion === 1) return '🥇';
    if (posicion === 2) return '🥈';
    if (posicion === 3) return '🥉';
    return null;
  };

  const getRatingColor = (rating: number) => {
    if (!rating) return 'text-gray-600 dark:text-gray-400';
    if (rating >= 80) return 'text-green-600 dark:text-green-400';
    if (rating >= 70) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 55) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Show loading while auth or data is loading
  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Don't render if no user (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-green-600 dark:text-green-400 hover:text-green-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-green-600" />
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Ranking</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={user.id} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 bg-green-600">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Clasificación General
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Pos.</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Jugador</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-300">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {jugadores.map((jugador) => (
                  <tr 
                    key={jugador.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${jugador.id === user.id ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center w-8">
                        {getMedalla(jugador.posicion) ? (
                          <span className="text-2xl">{getMedalla(jugador.posicion)}</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400 font-medium">#{jugador.posicion}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                          {jugador.avatar_url ? (
                            <img 
                              src={jugador.avatar_url} 
                              alt={jugador.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{jugador.username}</p>
                          {jugador.id === user.id && (
                            <span className="text-xs text-green-600 dark:text-green-400">Tú</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className={`text-xl font-bold ${getRatingColor(jugador.rating)}`}>
                          {jugador.rating || '-'}
                        </span>
                        {jugador.rating && <TrendingUp className="w-4 h-4 text-green-500" />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {jugadores.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No hay jugadores en el ranking aún
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}