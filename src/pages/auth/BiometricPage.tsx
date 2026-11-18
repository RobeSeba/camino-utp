import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Fingerprint, KeyRound, RefreshCw } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/lib/constants';

type ScanState = 'idle' | 'scanning' | 'error';

export function BiometricPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ScanState>('idle');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'staff' || user.role === 'admin' ? ROUTES.staff : ROUTES.home, { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const startScan = () => {
    setState('scanning');
    timerRef.current = window.setTimeout(() => setState('error'), 1800);
  };

  const goToPassword = () => {
    navigate(ROUTES.login);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface px-5 py-4">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <Logo to={ROUTES.login} />
          <Link
            to={ROUTES.login}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al ingreso
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <div className="card p-6 text-center sm:p-8">
          {state !== 'error' ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                Acceso biométrico
              </p>
              <h1 className="mt-2 text-2xl font-bold">Coloca tu dedo en el lector</h1>
              <p className="mt-2 text-sm text-muted">
                Usa el sensor de tu dispositivo para ingresar sin escribir tu contraseña.
              </p>

              <div className="relative mx-auto mt-8 flex h-32 w-32 items-center justify-center">
                {state === 'scanning' && (
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-ring" aria-hidden="true" />
                )}
                <span className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand bg-brand-soft text-brand">
                  <Fingerprint className="h-12 w-12" aria-hidden="true" />
                </span>
              </div>

              <p className="mt-6 min-h-[1.25rem] text-sm font-medium text-ink" role="status">
                {state === 'idle' && 'Listo para leer tu huella'}
                {state === 'scanning' && 'Verificando tu identidad…'}
              </p>

              <Button
                className="mt-6"
                size="lg"
                fullWidth
                loading={state === 'scanning'}
                onClick={startScan}
              >
                {state === 'scanning' ? 'Escaneando' : 'Iniciar lectura'}
              </Button>

              <Button
                variant="ghost"
                className="mt-2"
                fullWidth
                icon={KeyRound}
                onClick={goToPassword}
              >
                Usar contraseña
              </Button>
            </>
          ) : (
            <div className="text-left">
              <div className="flex flex-col items-center text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-warning-soft text-warning">
                  <AlertTriangle className="h-8 w-8" aria-hidden="true" />
                </span>
                <h1 className="mt-4 text-xl font-bold">Tu huella no está disponible ahora</h1>
                <p className="mt-2 text-sm text-muted">
                  No pudimos acceder al lector biométrico de este dispositivo.
                </p>
              </div>

              <dl className="mt-6 space-y-3 rounded-xl border border-line bg-canvas p-4 text-sm">
                <div>
                  <dt className="font-semibold text-ink">Qué ocurrió</dt>
                  <dd className="text-muted">
                    El sensor no respondió o no tiene una huella registrada para tu cuenta.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Por qué ocurrió</dt>
                  <dd className="text-muted">
                    Puede estar deshabilitado en el navegador, sin permisos o con el registro
                    biométrico eliminado.
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink">Cómo continuar</dt>
                  <dd className="text-muted">
                    Ingresa con tu contraseña o vuelve a intentar la lectura. Si persiste, acude a la
                    mesa de ayuda.
                  </dd>
                </div>
              </dl>

              <div className="mt-6 space-y-2">
                <Button fullWidth size="lg" icon={KeyRound} onClick={goToPassword}>
                  Ingresar con contraseña
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  icon={RefreshCw}
                  onClick={() => setState('idle')}
                >
                  Volver a intentar
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          La lectura biométrica es parte del prototipo. La integración real con WebAuthn se evaluará
          en una etapa posterior.
        </p>
      </main>
    </div>
  );
}
