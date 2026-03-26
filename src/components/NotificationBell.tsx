'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notificacion {
  id: string;
  tipo: 'invitacion';
  partido_id: string;
  de_usuario_id: string;
  de_username?: string;
  partido_cancha?: string;
  partido_fecha?: string;
  partido_hora?: string;
}

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const router = useRouter();
  const supabase = createClient();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadNotificaciones();
    }
  }, [userId]);

  const loadNotificaciones = async () => {
    setLoading(true);
    
    const { data: invitaciones } = await supabase
      .from('invitaciones')
      .select(`
        id,
        partido_id,
        de_usuario_id,
        partido:partidos(cancha, fecha, hora),
        de_usuario:profiles!invitaciones_de_usuario_id_fkey(username)
      `)
      .eq('para_usuario_id', userId)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
      .limit(10);

    if (invitaciones) {
      setNotificaciones(invitaciones.map((i: any) => ({
        id: i.id,
        tipo: 'invitacion',
        partido_id: i.partido_id,
        de_usuario_id: i.de_usuario_id,
        de_username: i.de_usuario?.username,
        partido_cancha: i.partido?.cancha,
        partido_fecha: i.partido?.fecha,
        partido_hora: i.partido?.hora
      })));
    }
    
    setLoading(false);
  };

  const aceptarInvitacion = async (notificacionId: string, partidoId: string) => {
    await supabase
      .from('invitaciones')
      .update({ estado: 'aceptado' })
      .eq('id', notificacionId);

    await supabase.from('partido_jugadores').insert({
      partido_id: partidoId,
      usuario_id: userId,
      rol: 'invitado',
      equipo: null
    });

    loadNotificaciones();
  };

  const rechazarInvitacion = async (notificacionId: string) => {
    await supabase
      .from('invitaciones')
      .update({ estado: 'rechazado' })
      .eq('id', notificacionId);
    
    loadNotificaciones();
  };

  const handleClick = () => {
    if (notificaciones.length > 0) {
      setMostrarMenu(!mostrarMenu);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {notificaciones.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {notificaciones.length}
          </span>
        )}
      </button>

      {mostrarMenu && notificaciones.length > 0 && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notificaciones</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.map((notif) => (
              <div key={notif.id} className="p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <p className="text-sm text-gray-900 dark:text-white font-medium">
                  Nueva invitación
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {notif.partido_cancha}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Invitado por {notif.de_username}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      aceptarInvitacion(notif.id, notif.partido_id);
                      setMostrarMenu(false);
                    }}
                    className="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => {
                      rechazarInvitacion(notif.id);
                    }}
                    className="flex-1 px-2 py-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-xs rounded font-medium"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}