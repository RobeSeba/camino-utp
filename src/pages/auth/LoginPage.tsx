import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Accessibility,
  AlertCircle,
  ArrowRight,
  Fingerprint,
  GraduationCap,
  LifeBuoy,
  Lock,
  Mail,
  MapPin,
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/lib/constants';
import panel1 from '@/assets/panel1.png';

export function LoginPage() {
  const { login, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'staff' || user.role === 'admin' ? ROUTES.staff : ROUTES.home, { replace: true });
    }
  }, [isAuthenticated, navigate, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas text-muted" role="status" aria-live="polite">
        <Spinner className="h-6 w-6" />
        <span className="ml-3 text-sm font-medium">Cargando…</span>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'No se pudo iniciar sesión.');
      return;
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Panel de marca */}
      {/* quitar ek bd-brand */}
      <section className="relative hidden overflow-hidden bg-cover bg-center bg-no-repeat p-10 text-white lg:flex lg:flex-col" style={{ backgroundImage: `url(${panel1})` }}>
        {/* Capa oscura semitransparente para asegurar contraste */}
        <div className="absolute inset-0 bg-black/60 mix-blend-multiply" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/20"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-16 top-1/3 h-40 w-40 rounded-full border border-white/15"
          aria-hidden="true"
        />

        <Logo tone="inverse" to={ROUTES.login} className="relative z-10" />

        <div className="relative z-10 my-auto max-w-lg">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Comunidad UTP
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-brand">
            Tu campus, a un paso.
          </h1>
          <p className="mt-4 text-base text-white/80">
            Encuentra tu aula, reporta una incidencia y sigue la respuesta del SAE desde un solo
            lugar.
          </p>

          <ul className="mt-10 space-y-5">
            <Feature
              icon={MapPin}
              title="Rutas guiadas dentro del campus"
              description="Busca por código de aula y llega sin dar vueltas."
            />
            <Feature
              icon={LifeBuoy}
              title="Centro de ayuda y tickets"
              description="Reporta incidencias y revisa el estado con tu código de seguimiento."
            />
            <Feature
              icon={Accessibility}
              title="Diseñada para todas las personas"
              description="Tamaño de texto, contraste y movimiento ajustables."
            />
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/60">
          Universidad Tecnológica del Perú · Sede Lima Centro
        </p>
      </section>

      {/* Formulario */}
      <section className="flex flex-col justify-center bg-surface px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-md">
          <Logo className="mb-8 lg:hidden" to={ROUTES.login} />

          <h2 className="text-2xl font-bold sm:text-3xl">Bienvenido de nuevo</h2>
          <p className="mt-2 text-sm text-muted">
            Ingresa con tu correo institucional para continuar.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-line border-l-4 border-l-danger bg-danger-soft p-3.5 text-sm text-ink"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
              <div>
                <p className="font-semibold">No pudimos iniciar tu sesión</p>
                <p className="mt-0.5 text-muted">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <Input
              label="Correo institucional"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="nombre.apellido@utp.edu.pe"
              icon={Mail}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Input
              label="Contraseña"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="Ingresa tu contraseña"
              icon={Lock}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  className="h-4 w-4 rounded border-line accent-brand"
                />
                Recordarme
              </label>
              <Link to={ROUTES.recover} className="text-sm font-semibold text-brand hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Ingresar
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
            <span className="h-px flex-1 bg-line" />
            o continúa con
            <span className="h-px flex-1 bg-line" />
          </div>

          <Button
            variant="secondary"
            fullWidth
            size="lg"
            icon={Fingerprint}
            onClick={() => navigate(ROUTES.biometric)}
          >
            Ingresar con huella digital
          </Button>
          <p className="mt-8 text-center text-xs text-muted">
            ¿Problemas para acceder? Escríbenos a{' '}
            <a href="mailto:sae.limasur@utp.edu.pe" className="font-semibold text-brand hover:underline">
              sae.limasur@utp.edu.pe
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <li className="flex gap-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-white/70">{description}</p>
      </div>
    </li>
  );
}
