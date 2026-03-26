'use client';

import { useAuth } from '@/components/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, Users } from 'lucide-react';

export default function NuevoPartidoPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('18:00');
  const [cancha, setCancha] = useState('');
  const [maxJugadores, setMaxJugadores] = useState(10);
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const crearPartido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cancha || !fecha || !hora) return;

    setCreando(true);

    const { data: partido, error } = await supabase
      .from('partidos')
      .insert({
        creador_id: user.id,
        fecha,
        hora,
        cancha,
        max_jugadores: maxJugadores,
        estado: 'pendiente'
      })
      .select()
      .single();

    if (error) {
      alert('Error al crear el partido: ' + error.message);
      setCreando(false);
      return;
    }

    await supabase.from('partido_jugadores').insert({
      partido_id: partido.id,
      usuario_id: user.id,
      rol: 'creador',
      equipo: 'a'
    });

    router.push(`/partido/${partido.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Crear Nueva Pichanga</h1>

        <form onSubmit={crearPartido} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cancha
            </label>
            <input
              type="text"
              value={cancha}
              onChange={(e) => setCancha(e.target.value)}
              placeholder="Ej: Cancha municipal de Las Condes"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Hora
              </label>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Máximo de Jugadores
            </label>
            <select
              value={maxJugadores}
              onChange={(e) => setMaxJugadores(Number(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={6}>6 jugadores (Fútbol 3)</option>
              <option value={8}>8 jugadores (Fútbol 5)</option>
              <option value={10}>10 jugadores (Fútbol 7)</option>
              <option value={14}>14 jugadores (Fútbol 9)</option>
              <option value={22}>22 jugadores (Fútbol 11)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creando}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {creando ? 'Creando...' : 'Crear Pichanga'}
          </button>
        </form>
      </main>
    </div>
  );
}