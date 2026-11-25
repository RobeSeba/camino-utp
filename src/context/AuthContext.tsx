import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createIsolatedClient, supabase } from '@/lib/supabase';
import { fetchMyProfile, updateMyProfile } from '@/services/profiles';
import type { Profile, Role } from '@/types';
import { DEMO_ACCOUNTS } from '@/lib/constants';

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export interface UpdateProfileResult {
  ok: boolean;
  error?: string;
  profile?: Profile;
}

interface AuthContextValue {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  loginAsDemo: (role: Role) => Promise<LoginResult>;
  logout: () => Promise<void>;
  updateProfile: (patch: { fullName: string; phone: string; career: string; cycle: string }) => Promise<UpdateProfileResult>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<LoginResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<LoginResult>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string): LoginResult | null {
  if (!email || !password) {
    return { ok: false, error: 'Ingresa tu correo y tu contraseña para continuar.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'El formato del correo no es válido.' };
  }
  if (!email.endsWith('@utp.edu.pe')) {
    return { ok: false, error: 'Usa tu correo institucional terminado en @utp.edu.pe.' };
  }
  if (password.length < 6) {
    return { ok: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }
  return null;
}

function authErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) {
    return 'Correo o contraseña incorrectos. Verifica tus datos e inténtalo otra vez.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada para activarlo.';
  }
  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Demasiados intentos. Espera unos minutos e inténtalo nuevamente.';
  }
  if (lower.includes('user not found')) {
    return 'No encontramos una cuenta con ese correo.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'No pudimos conectarnos. Revisa tu conexión e inténtalo otra vez.';
  }
  return 'No se pudo completar la operación. Inténtalo nuevamente.';
}

function passwordErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();
  if (lower.includes('different from the old password') || lower.includes('same password')) {
    return 'La nueva contraseña debe ser distinta de la actual.';
  }
  if (lower.includes('at least') || lower.includes('weak') || lower.includes('should contain')) {
    return 'La nueva contraseña es demasiado débil. Usa al menos 8 caracteres con letras y números.';
  }
  if (lower.includes('reauthentication') || lower.includes('session')) {
    return 'Tu sesión necesita validarse de nuevo. Cierra sesión, vuelve a ingresar e inténtalo otra vez.';
  }
  return authErrorMessage(error);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (session: Session | null) => {
    const sessionUser = session?.user;
    if (!sessionUser) {
      userIdRef.current = null;
      setUser(null);
      return;
    }
    userIdRef.current = sessionUser.id;
    try {
      const profile = await fetchMyProfile(sessionUser.id);
      if (profile) {
        setUser(profile);
      } else {
        // Fallback mínimo si el perfil aún no está disponible (p. ej. justo tras registro).
        setUser({
          id: sessionUser.id,
          fullName: (sessionUser.user_metadata?.full_name as string | undefined) ?? sessionUser.email ?? 'Usuario',
          studentCode: '',
          email: sessionUser.email ?? '',
          phone: '',
          career: '',
          campus: '',
          cycle: '',
          role: 'student',
        });
      }
    } catch {
      // Mantener sesión de Auth aunque falle la carga del perfil.
      setUser((current) =>
        current?.id === sessionUser.id
          ? current
          : {
              id: sessionUser.id,
              fullName: sessionUser.email ?? 'Usuario',
              studentCode: '',
              email: sessionUser.email ?? '',
              phone: '',
              career: '',
              campus: '',
              cycle: '',
              role: 'student',
            },
      );
    }
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        await loadProfile(data.session);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void init();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!active) return;
        // Un cambio de datos de la cuenta (p. ej. la contrasena) no cambia quien
        // esta conectado: se refresca el perfil sin mostrar el spinner global,
        // que desmontaria la pagina y borraria el formulario en pantalla.
        if (event === 'USER_UPDATED') {
          void loadProfile(session);
          return;
        }
        void (async () => {
          setIsLoading(true);
          try {
            await loadProfile(session);
          } finally {
            if (active) setIsLoading(false);
          }
        })();
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const normalizedEmail = normalizeEmail(email);
    const validationError = validateCredentials(normalizedEmail, password);
    if (validationError) return validationError;

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      return { ok: false, error: authErrorMessage(error) };
    }
    return { ok: true };
  }, []);

  const loginAsDemo = useCallback(async (role: Role): Promise<LoginResult> => {
    const demo = DEMO_ACCOUNTS.find((account) => account.role === role) ?? DEMO_ACCOUNTS[0];
    if (!demo) return { ok: false, error: 'No hay cuentas de demostración configuradas.' };
    return login(demo.email, demo.password);
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      userIdRef.current = null;
      setUser(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const id = userIdRef.current;
    if (!id) return;
    try {
      const profile = await fetchMyProfile(id);
      if (profile) setUser(profile);
    } catch {
      // Ignorar: se conserva el perfil en memoria.
    }
  }, []);

  const updateProfile = useCallback(
    async (patch: { fullName: string; phone: string; career: string; cycle: string }): Promise<UpdateProfileResult> => {
      const id = userIdRef.current;
      if (!id) return { ok: false, error: 'No hay una sesión activa.' };
      try {
        const profile = await updateMyProfile(id, patch);
        setUser(profile);
        return { ok: true, profile };
      } catch (error) {
        return { ok: false, error: authErrorMessage(error) };
      }
    },
    [],
  );

  const resetPassword = useCallback(async (email: string): Promise<LoginResult> => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { ok: false, error: 'Ingresa un correo válido, por ejemplo nombre.apellido@utp.edu.pe' };
    }
    if (!normalizedEmail.endsWith('@utp.edu.pe')) {
      return { ok: false, error: 'El correo debe pertenecer al dominio @utp.edu.pe' };
    }
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
    if (error) return { ok: false, error: authErrorMessage(error) };
    return { ok: true };
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<LoginResult> => {
      const email = user?.email;
      if (!email) return { ok: false, error: 'No hay una sesión activa.' };

      // 1) Comprobar la contrasena actual con un cliente aislado (no toca la sesion activa).
      const verifier = createIsolatedClient();
      const { error: verifyError } = await verifier.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (verifyError) {
        const lower = verifyError.message.toLowerCase();
        if (lower.includes('invalid login credentials')) {
          return { ok: false, error: 'La contraseña actual no es correcta.' };
        }
        return { ok: false, error: authErrorMessage(verifyError) };
      }

      // 2) Cambiar la contrasena en la sesion activa.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { ok: false, error: passwordErrorMessage(error) };
      return { ok: true };
    },
    [user?.email],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      loginAsDemo,
      logout,
      updateProfile,
      refreshProfile,
      resetPassword,
      changePassword,
    }),
    [user, isLoading, login, loginAsDemo, logout, updateProfile, refreshProfile, resetPassword, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
