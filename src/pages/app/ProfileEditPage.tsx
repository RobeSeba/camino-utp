import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, KeyRound, Save } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ROUTES } from '@/lib/constants';
import { isValidEmail } from '@/lib/utils';

const CAREERS = [
  'Ingeniería de Sistemas e Informática',
  'Ingeniería de Software',
  'Ingeniería Industrial',
  'Administración de Empresas',
  'Contabilidad',
  'Derecho',
  'Psicología',
];

const CYCLES = Array.from({ length: 10 }, (_, index) => ({
  value: `Ciclo ${index + 1}`,
  label: `Ciclo ${index + 1}`,
}));

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  career: string;
  cycle: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

interface PasswordState {
  current: string;
  next: string;
  confirm: string;
}

type PasswordErrors = Partial<Record<keyof PasswordState, string>>;

const EMPTY_PASSWORD: PasswordState = { current: '', next: '', confirm: '' };
const MIN_PASSWORD_LENGTH = 8;

export function ProfileEditPage() {
  const { user, updateProfile, changePassword } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    fullName: user?.fullName ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    career: user?.career ?? CAREERS[0],
    cycle: user?.cycle ?? 'Ciclo 1',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState<PasswordState>(EMPTY_PASSWORD);
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [changingPassword, setChangingPassword] = useState(false);

  const updatePassword = (field: keyof PasswordState, value: string) => {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    setPasswordErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validatePassword = (): PasswordErrors => {
    const next: PasswordErrors = {};
    if (!passwordForm.current) {
      next.current = 'Ingresa tu contraseña actual.';
    }
    if (passwordForm.next.length < MIN_PASSWORD_LENGTH) {
      next.next = `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    } else if (!/[A-Za-z]/.test(passwordForm.next) || !/\d/.test(passwordForm.next)) {
      next.next = 'Combina letras y números.';
    } else if (passwordForm.next === passwordForm.current) {
      next.next = 'La nueva contraseña debe ser distinta de la actual.';
    }
    if (!passwordForm.confirm) {
      next.confirm = 'Repite la nueva contraseña.';
    } else if (passwordForm.confirm !== passwordForm.next) {
      next.confirm = 'Las contraseñas no coinciden.';
    }
    return next;
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validatePassword();
    if (Object.keys(nextErrors).length > 0) {
      setPasswordErrors(nextErrors);
      notify('Revisa el formulario', 'Corrige los datos de la contraseña antes de continuar.', 'error');
      return;
    }

    setChangingPassword(true);
    const result = await changePassword(passwordForm.current, passwordForm.next);
    setChangingPassword(false);
    if (!result.ok) {
      if (result.error?.includes('contraseña actual')) {
        setPasswordErrors({ current: result.error });
      }
      notify('No se pudo cambiar la contraseña', result.error ?? 'Inténtalo nuevamente.', 'error');
      return;
    }
    setPasswordForm(EMPTY_PASSWORD);
    setPasswordErrors({});
    notify('Contraseña actualizada', 'Usa la nueva contraseña la próxima vez que inicies sesión.');
  };

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (form.fullName.trim().length < 5) {
      next.fullName = 'Escribe tus nombres y apellidos completos.';
    }
    if (!/^(\+51\s?)?9\d{2}\s?\d{3}\s?\d{3}$/.test(form.phone.trim()) && !/^\d{9}$/.test(form.phone.replace(/\s/g, ''))) {
      next.phone = 'Ingresa un celular de 9 dígitos, por ejemplo 987 654 321.';
    }
    if (!isValidEmail(form.email)) {
      next.email = 'El correo no tiene un formato válido.';
    }
    if (!form.career) {
      next.career = 'Selecciona tu carrera.';
    }
    if (!form.cycle) {
      next.cycle = 'Selecciona tu ciclo.';
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      notify('Revisa el formulario', 'Hay campos que necesitan corrección antes de guardar.', 'error');
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      career: form.career,
      cycle: form.cycle,
    });
    setSaving(false);
    if (!result.ok) {
      notify('No se pudo actualizar el perfil', result.error ?? 'Inténtalo nuevamente.', 'error');
      return;
    }
    notify('Datos actualizados', 'Tus cambios se guardaron correctamente.');
    navigate(ROUTES.profile);
  };

  if (!user) {
    return (
      <Card className="text-center">
        <p className="text-sm text-muted">No hay una sesión activa.</p>
        <Link to={ROUTES.login} className="mt-3 inline-block">
          <Button>Ir al ingreso</Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Datos personales"
        title="Editar perfil"
        description="Actualiza tu información de contacto. Los datos académicos se validan con la universidad."
        backTo={{ to: ROUTES.profile, label: 'Volver a mi perfil' }}
      />

      <form onSubmit={handleSubmit} noValidate>
        <Card padding="lg">
          <div className="flex items-start gap-2.5 rounded-xl border border-line border-l-4 border-l-info bg-info-soft p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
            <p className="text-muted">
              El correo institucional y el código de estudiante no se editan desde aquí. Si necesitas
              corregirlos, abre un ticket de categoría <span className="font-medium text-ink">Accesos y seguridad</span>.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input
              label="Nombres y apellidos"
              name="fullName"
              value={form.fullName}
              onChange={(event) => update('fullName', event.target.value)}
              error={errors.fullName}
              autoComplete="name"
              required
              containerClassName="sm:col-span-2"
            />
            <Input
              label="Correo institucional"
              name="email"
              value={form.email}
              readOnly
              disabled
              hint="Gestionado por la universidad."
              containerClassName="sm:col-span-2"
            />
            <Input
              label="Teléfono de contacto"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              error={errors.phone}
              hint="Lo usamos solo para contactarte por tu ticket."
              autoComplete="tel"
              required
            />
            <div className="flex flex-col justify-end">
              <p className="mb-1.5 text-sm font-medium text-ink">Código de estudiante</p>
              <div className="flex h-11 items-center rounded-xl border border-line bg-canvas px-3 text-sm text-muted">
                {user.studentCode}
              </div>
              <p className="mt-1.5 text-xs text-muted">Dato verificado, no editable.</p>
            </div>
            <Select
              label="Carrera"
              name="career"
              value={form.career}
              onChange={(event) => update('career', event.target.value)}
              options={CAREERS.map((career) => ({ value: career, label: career }))}
              error={errors.career}
              required
            />
            <Select
              label="Ciclo"
              name="cycle"
              value={form.cycle}
              onChange={(event) => update('cycle', event.target.value)}
              options={CYCLES}
              error={errors.cycle}
              required
            />
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Link to={ROUTES.profile}>
              <Button variant="secondary" fullWidth>
                Cancelar
              </Button>
            </Link>
            <Button type="submit" icon={Save} loading={saving}>
              Guardar cambios
            </Button>
          </div>
        </Card>
      </form>

      <form onSubmit={handlePasswordSubmit} noValidate className="mt-6">
        <Card padding="lg">
          <div className="flex items-center gap-2.5">
            <KeyRound className="h-5 w-5 text-brand" aria-hidden="true" />
            <h2 className="text-lg font-bold text-ink">Cambiar contraseña</h2>
          </div>
          <p className="mt-1 text-sm text-muted">
            Por seguridad, confirma tu contraseña actual antes de elegir una nueva.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Input
              label="Contraseña actual"
              name="currentPassword"
              type="password"
              value={passwordForm.current}
              onChange={(event) => updatePassword('current', event.target.value)}
              error={passwordErrors.current}
              autoComplete="current-password"
              required
              containerClassName="sm:col-span-2"
            />
            <Input
              label="Nueva contraseña"
              name="newPassword"
              type="password"
              value={passwordForm.next}
              onChange={(event) => updatePassword('next', event.target.value)}
              error={passwordErrors.next}
              hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres, con letras y números.`}
              autoComplete="new-password"
              required
            />
            <Input
              label="Confirmar nueva contraseña"
              name="confirmPassword"
              type="password"
              value={passwordForm.confirm}
              onChange={(event) => updatePassword('confirm', event.target.value)}
              error={passwordErrors.confirm}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="mt-6 flex justify-end border-t border-line pt-5">
            <Button type="submit" icon={KeyRound} loading={changingPassword}>
              Cambiar contraseña
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
