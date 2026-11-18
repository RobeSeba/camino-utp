import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AccessibilityPreferences, ThemePreference } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  deleteAccessibilityPreferences,
  fetchAccessibilityPreferences,
  saveAccessibilityPreferences,
} from '@/services/accessibility';

const STORAGE_KEY = 'camino-utp:a11y';

const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  fontScale: 1,
  theme: 'system',
  highContrast: false,
  reduceMotion: false,
};

interface AccessibilityContextValue {
  preferences: AccessibilityPreferences;
  resolvedTheme: 'light' | 'dark';
  isSyncing: boolean;
  setFontScale: (value: number) => void;
  setTheme: (theme: ThemePreference) => void;
  setHighContrast: (value: boolean) => void;
  setReduceMotion: (value: boolean) => void;
  resetPreferences: () => Promise<void>;
  savePreferences: () => Promise<boolean>;
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function loadPreferences(): AccessibilityPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AccessibilityPreferences>;
    return {
      fontScale:
        typeof parsed.fontScale === 'number' && parsed.fontScale >= 0.85 && parsed.fontScale <= 1.3
          ? parsed.fontScale
          : DEFAULT_PREFERENCES.fontScale,
      theme:
        parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
          ? parsed.theme
          : DEFAULT_PREFERENCES.theme,
      highContrast: Boolean(parsed.highContrast),
      reduceMotion: Boolean(parsed.reduceMotion),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function persistLocal(preferences: AccessibilityPreferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // Sin almacenamiento: las preferencias se mantienen en memoria.
  }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(loadPreferences);
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(prefers-color-scheme: dark)').matches,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const hydratedForUser = useRef<string | null>(null);
  const latestPreferences = useRef(preferences);
  latestPreferences.current = preferences;

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'light' | 'dark' =
    preferences.theme === 'system' ? (systemDark ? 'dark' : 'light') : preferences.theme;

  // Aplica los tokens al documento y guarda localmente.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.contrast = preferences.highContrast ? 'high' : 'normal';
    root.dataset.motion = preferences.reduceMotion ? 'reduced' : 'full';
    root.style.setProperty('--font-scale', String(preferences.fontScale));

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', resolvedTheme === 'dark' ? '#0b0d12' : '#c00511');
    }

    persistLocal(preferences);
  }, [preferences, resolvedTheme]);

  // Cargar preferencias del usuario autenticado (con fallback local).
  useEffect(() => {
    const userId = user?.id ?? null;
    if (!userId) {
      hydratedForUser.current = null;
      return;
    }
    if (hydratedForUser.current === userId) return;

    let active = true;
    setIsSyncing(true);
    void (async () => {
      try {
        const remote = await fetchAccessibilityPreferences(userId);
        if (!active) return;
        if (remote) {
          setPreferences({
            fontScale:
              typeof remote.fontScale === 'number' && remote.fontScale >= 0.85 && remote.fontScale <= 1.3
                ? remote.fontScale
                : DEFAULT_PREFERENCES.fontScale,
            theme:
              remote.theme === 'light' || remote.theme === 'dark' || remote.theme === 'system'
                ? remote.theme
                : DEFAULT_PREFERENCES.theme,
            highContrast: Boolean(remote.highContrast),
            reduceMotion: Boolean(remote.reduceMotion),
          });
        }
        hydratedForUser.current = userId;
      } catch {
        // Fallback: conservar preferencias locales si falla la carga remota.
        if (active) hydratedForUser.current = userId;
      } finally {
        if (active) setIsSyncing(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user?.id]);

  // Guardado automático en BD cuando hay usuario (debounce).
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    if (hydratedForUser.current !== userId) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveAccessibilityPreferences(userId, latestPreferences.current).catch(() => {
        // Fallback silencioso: ya quedó guardado localmente.
      });
    }, 600);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [preferences, user?.id]);

  const setFontScale = useCallback((value: number) => {
    setPreferences((current) => ({ ...current, fontScale: value }));
  }, []);

  const setTheme = useCallback((theme: ThemePreference) => {
    setPreferences((current) => ({ ...current, theme }));
  }, []);

  const setHighContrast = useCallback((value: boolean) => {
    setPreferences((current) => ({ ...current, highContrast: value }));
  }, []);

  const setReduceMotion = useCallback((value: boolean) => {
    setPreferences((current) => ({ ...current, reduceMotion: value }));
  }, []);

  const resetPreferences = useCallback(async () => {
    setPreferences(DEFAULT_PREFERENCES);
    persistLocal(DEFAULT_PREFERENCES);
    const userId = user?.id;
    if (!userId) return;
    try {
      await deleteAccessibilityPreferences(userId);
    } catch {
      // Si falla el borrado remoto, el estado local ya fue restablecido.
    }
  }, [user?.id]);

  const savePreferences = useCallback(async (): Promise<boolean> => {
    const userId = user?.id;
    if (!userId) return true; // Sin sesión: solo aplica localmente.
    try {
      setIsSyncing(true);
      await saveAccessibilityPreferences(userId, latestPreferences.current);
      return true;
    } catch {
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id]);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      preferences,
      resolvedTheme,
      isSyncing,
      setFontScale,
      setTheme,
      setHighContrast,
      setReduceMotion,
      resetPreferences,
      savePreferences,
    }),
    [preferences, resolvedTheme, isSyncing, setFontScale, setTheme, setHighContrast, setReduceMotion, resetPreferences, savePreferences],
  );

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility debe usarse dentro de AccessibilityProvider');
  }
  return context;
}
