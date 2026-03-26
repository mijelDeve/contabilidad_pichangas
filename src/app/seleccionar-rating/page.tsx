'use client';

import { useAuth } from '@/components/AuthProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Star, ArrowRight } from 'lucide-react';

const RATING_OPTIONS = [
  { value: 40, label: 'Principiante', description: 'Recién empiezo a jugar', stars: 1 },
  { value: 55, label: 'Amateur', description: 'Juego ocasionalmente', stars: 2 },
  { value: 70, label: 'Intermedio', description: 'Juego regularmente', stars: 3 },
  { value: 80, label: 'Avanzado', description: 'Tengo experiencia', stars: 4 },
  { value: 90, label: 'Profesional', description: 'Nivel competitivo', stars: 5 },
];

export default function SeleccionarRatingPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [seleccionando, setSeleccionando] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && profile?.rating_inicial) {
      router.push('/dashboard');
    }
  }, [user, profile, loading, router]);

  const guardarRating = async () => {
    if (!user || !selectedRating) return;
    
    setSeleccionando(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        rating: selectedRating,
        rating_inicial: selectedRating
      })
      .eq('id', user.id);

    if (!error) {
      await supabase.from('ratings_historico').insert({
        usuario_id: user.id,
        rating: selectedRating,
        motivo: 'inicial'
      });
      
      router.push('/dashboard');
    }
    
    setSeleccionando(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (profile?.rating_inicial) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-end">
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ¿Cómo te evalúas?
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Selecciona tu nivel de experiencia en fútbol para calcular tu rating inicial
          </p>
        </div>

        <div className="space-y-4">
          {RATING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedRating(option.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selectedRating === option.value
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < option.stars
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {option.label}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {option.value}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={guardarRating}
          disabled={!selectedRating || seleccionando}
          className="w-full mt-8 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-4 px-6 rounded-xl transition-colors"
        >
          {seleccionando ? 'Guardando...' : 'Continuar'}
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Este rating seará tu punto de partida y cambiará según tu desempeño
        </p>
      </main>
    </div>
  );
}