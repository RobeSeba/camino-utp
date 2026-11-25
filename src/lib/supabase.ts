import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Configuracion incompleta: define VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en el archivo .env.',
  );
}

/**
 * Cliente unico de Supabase para toda la aplicacion.
 *
 * Solo usa la clave publica (publishable/anon). La seguridad de los
 * datos depende de las politicas RLS definidas en supabase/migrations.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'camino-utp:auth',
  },
});

/**
 * Cliente temporal, sin sesion persistente ni eventos compartidos con el
 * cliente principal. Se usa para comprobar la contrasena actual sin
 * disparar cambios de estado en la sesion activa de la aplicacion.
 */
export function createIsolatedClient() {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
