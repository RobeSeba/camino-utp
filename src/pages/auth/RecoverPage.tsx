import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MailCheck, Send } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { ROUTES } from '@/lib/constants';

export function RecoverPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? 'No pudimos enviar el enlace. Inténtalo nuevamente.');
      return;
    }
    setSent(true);
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
        <div className="card p-6 sm:p-8">
          {sent ? (
            <div className="text-center">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
                <MailCheck className="h-8 w-8" aria-hidden="true" />
              </span>
              <h1 className="mt-4 text-xl font-bold">Revisa tu correo</h1>
              <p className="mt-2 text-sm text-muted">
                Si <span className="font-medium text-ink">{email}</span> está registrado, recibirás un
                enlace para restablecer tu contraseña. Revisa también la carpeta de spam.
              </p>
              <div className="mt-6 space-y-2">
                <Button fullWidth onClick={() => setSent(false)} variant="secondary">
                  Usar otro correo
                </Button>
                <Link to={ROUTES.login} className="block">
                  <Button fullWidth>Volver al ingreso</Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted">
                El enlace vence en 30 minutos. En la Etapa 3 este envío se hará con Supabase Auth.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">Recuperar acceso</p>
              <h1 className="mt-2 text-2xl font-bold">¿Olvidaste tu contraseña?</h1>
              <p className="mt-2 text-sm text-muted">
                Escribe tu correo institucional y te enviaremos un enlace para crear una nueva.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
                <Input
                  label="Correo institucional"
                  type="email"
                  name="email"
                  icon={Mail}
                  placeholder="nombre.apellido@utp.edu.pe"
                  value={email}
                  error={error ?? undefined}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError(null);
                  }}
                  autoComplete="email"
                  required
                />
                <Button type="submit" fullWidth size="lg" loading={loading} icon={Send}>
                  Enviar enlace de recuperación
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted">
                Si no tienes acceso a tu correo institucional, comunícate con la mesa de ayuda al{' '}
                <span className="font-medium text-ink">+51 1 315 9600</span>.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
