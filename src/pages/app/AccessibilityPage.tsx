import { Link } from 'react-router-dom';
import {
  Accessibility as AccessibilityIcon,
  Check,
  Monitor,
  Moon,
  RotateCcw,
  Save,
  Sun,
  Type,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { useAccessibility } from '@/context/AccessibilityContext';
import { useToast } from '@/context/ToastContext';
import { FONT_SCALE_OPTIONS, ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { ThemePreference } from '@/types';

const THEMES: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'light', label: 'Claro', description: 'Fondo claro, texto oscuro.', icon: Sun },
  { value: 'dark', label: 'Oscuro', description: 'Reduce el brillo de la pantalla.', icon: Moon },
  { value: 'system', label: 'Sistema', description: 'Sigue la configuración del dispositivo.', icon: Monitor },
];

export function AccessibilityPage() {
  const {
    preferences,
    resolvedTheme,
    isSyncing,
    setFontScale,
    setTheme,
    setHighContrast,
    setReduceMotion,
    resetPreferences,
    savePreferences,
  } = useAccessibility();
  const { notify } = useToast();

  const handleSave = async () => {
    const ok = await savePreferences();
    if (ok) {
      notify('Preferencias guardadas', 'Tus ajustes de accesibilidad se aplicaron correctamente.');
    } else {
      notify('No se pudieron guardar en la nube', 'Tus ajustes se mantienen en este dispositivo. Intenta nuevamente.', 'error');
    }
  };

  const handleReset = async () => {
    await resetPreferences();
    notify('Preferencias restablecidas', 'Se restauraron los valores predeterminados.');
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Preferencias"
        title="Accesibilidad"
        description="Adapta la lectura y el contraste de toda la aplicación. Los cambios se aplican al instante."
        actions={
          <Badge tone="brand" withDot>
            Tema {resolvedTheme === 'dark' ? 'oscuro' : 'claro'} activo
          </Badge>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {/* Tamano de fuente */}
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Type className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Tamaño del texto</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Ajusta el tamaño de todos los textos de la interfaz hasta un 125%.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Tamaño del texto">
              {FONT_SCALE_OPTIONS.map((option) => {
                const active = Math.abs(preferences.fontScale - option.value) < 0.001;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFontScale(option.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition',
                      active
                        ? 'border-brand bg-brand-soft'
                        : 'border-line bg-surface hover:border-brand',
                    )}
                  >
                    <span className="text-lg font-bold text-ink" aria-hidden="true">
                      {option.sample}
                    </span>
                    <span className="text-xs font-medium text-muted">{option.label}</span>
                    <span className="text-[11px] text-muted">{Math.round(option.value * 100)}%</span>
                    {active && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand text-white">
                        <Check className="h-3 w-3" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Tema */}
          <Card>
            <h2 className="text-base font-semibold">Tema de la interfaz</h2>
            <p className="mt-0.5 text-sm text-muted">
              Elige un tema claro, oscuro o sincronizado con tu dispositivo.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema de la interfaz">
              {THEMES.map((theme) => {
                const active = preferences.theme === theme.value;
                return (
                  <button
                    key={theme.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTheme(theme.value)}
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border p-3 text-left transition',
                      active
                        ? 'border-brand bg-brand-soft'
                        : 'border-line bg-surface hover:border-brand',
                    )}
                  >
                    <theme.icon className={cn('mt-0.5 h-4 w-4 shrink-0', active ? 'text-brand' : 'text-muted')} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                        {theme.label}
                        {active && <Check className="h-3.5 w-3.5 text-brand" aria-hidden="true" />}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{theme.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Opciones binarias */}
          <Card className="space-y-5">
            <Switch
              id="high-contrast"
              checked={preferences.highContrast}
              onChange={setHighContrast}
              label="Alto contraste"
              description="Refuerza el contraste entre el texto, los bordes y el fondo."
            />
            <div className="border-t border-line pt-5">
              <Switch
                id="reduce-motion"
                checked={preferences.reduceMotion}
                onChange={setReduceMotion}
                label="Reducir movimiento"
                description="Desactiva animaciones y transiciones que puedan generar molestias."
              />
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              icon={RotateCcw}
              disabled={isSyncing}
              onClick={() => void handleReset()}
            >
              Restablecer
            </Button>
            <Button icon={Save} loading={isSyncing} onClick={() => void handleSave()}>
              Guardar preferencias
            </Button>
          </div>
        </div>

        {/* Vista previa */}
        <aside className="space-y-5">
          <Card>
            <h2 className="text-sm font-semibold">Vista previa</h2>
            <div className="mt-3 rounded-xl border border-line bg-canvas p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Camino UTP</p>
              <p className="mt-2 text-base font-semibold text-ink">Aula A-201 · Pabellón A</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Sube por la escalera central al segundo piso y camina 15 metros por el pasillo. El
                aula está a mano derecha.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="brand">Piso 2</Badge>
                <Badge tone="success">Ruta accesible</Badge>
                <Badge tone="warning">Alto contraste {preferences.highContrast ? 'activo' : 'inactivo'}</Badge>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted">
              Esta tarjeta refleja el tamaño de texto y los colores que elijas.
            </p>
          </Card>

          <Card className="bg-canvas">
            <div className="flex items-start gap-2.5">
              <AccessibilityIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold">Accesibilidad desde el diseño</h2>
                <p className="mt-1 text-sm text-muted">
                  El contraste mínimo, los focos visibles y el tamaño base se definieron desde el
                  inicio. Estas preferencias complementan esa base y se guardan en este dispositivo.
                </p>
                <Link
                  to={ROUTES.faq}
                  className="mt-2 inline-block text-sm font-semibold text-brand hover:underline"
                >
                  Ver guía de accesibilidad
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
