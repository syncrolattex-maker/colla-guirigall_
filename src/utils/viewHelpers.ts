import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

// Evita que una query de Supabase deje el loading colgado para siempre.
// Si la red se queda latente al cambiar de pestaña, a los `ms` liberamos la UI.
export async function withTimeout<T>(promise: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Supabase timeout (${ms}ms)`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Listener de 'app-focus' con throttle: evita tormentas de refetch al
// volver a la pestaña o al navegar rápido entre vistas (causa del hang en desktop).
export function useAppFocusRefresh(cb: () => void, minIntervalMs = 5000) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const lastRef = useRef(0);

  useEffect(() => {
    const onFocus = () => {
      const now = Date.now();
      if (now - lastRef.current < minIntervalMs) return;
      lastRef.current = now;
      try {
        cbRef.current();
      } catch (e) {
        console.error('app-focus handler error:', e);
      }
    };
    window.addEventListener('app-focus', onFocus);
    return () => window.removeEventListener('app-focus', onFocus);
  }, [minIntervalMs]);
}

export interface ChannelSpec {
  // Nombre base; se le añade un sufijo único por montaje para evitar
  // colisiones cuando dos vistas usan el mismo nombre ('public:events', ...).
  name: string;
  table: string;
  filter?: string;
  onEvent: () => void;
}

// Suscribe canales realtime con nombre único y los elimina de forma segura.
// Sin esto, navegar entre pestañas dejaba suscripciones duplicadas
// que saturaban el socket y dejaban la vista en "latente".
export function useRealtimeChannels(specs: ChannelSpec[]) {
  const specsRef = useRef(specs);
  specsRef.current = specs;

  useEffect(() => {
    const uid = Math.random().toString(36).slice(2, 8);
    const channels = specsRef.current.map((s, i) => {
      const builder = supabase.channel(`${s.name}:${uid}:${i}`);
      const params: { event: '*'; schema: 'public'; table: string; filter?: string } = {
        event: '*',
        schema: 'public',
        table: s.table,
      };
      if (s.filter) params.filter = s.filter;
      return builder.on('postgres_changes', params as never, () => {
        try {
          // Leer el callback más reciente: evita closures obsoletas
          // (p. ej. selectedEventId o rehearsals desactualizados).
          specsRef.current[i]?.onEvent();
        } catch (e) {
          console.error(`realtime ${specsRef.current[i]?.table} handler error:`, e);
        }
      }).subscribe();
    });

    let cancelled = false;
    return () => {
      cancelled = true;
      // removeChannel es async; lo lanzamos sin bloquear el unmount,
      // pero con catch para no dejar promesas rechazadas.
      channels.forEach((ch) => {
        supabase.removeChannel(ch).catch((e) => {
          if (!cancelled) console.error('removeChannel error:', e);
        });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
