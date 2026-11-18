import { Link, useNavigate } from 'react-router-dom';
import {
  Accessibility,
  BookOpen,
  ChevronRight,
  GraduationCap,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketsContext';
import { ROUTES, ROLE_LABELS } from '@/lib/constants';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const { tickets, isLoading: ticketsLoading } = useTickets();
  const navigate = useNavigate();

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

  const openTickets = tickets.filter((ticket) => ['open', 'in_review', 'waiting_user'].includes(ticket.status)).length;

  return (
    <div>
      <PageHeader
        title="Mi perfil"
        description="Revisa tus datos de contacto y tus preferencias de la aplicación."
        actions={
          <Link to={ROUTES.profileEdit}>
            <Button icon={Pencil}>Editar perfil</Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding="lg">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Avatar name={user.fullName} size="xl" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold">{user.fullName}</h2>
                <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">{user.career}</p>
              <p className="mt-1 text-sm text-muted">
                Código {user.studentCode} · {user.cycle}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <DataRow icon={Mail} label="Correo institucional" value={user.email} />
            <DataRow icon={Phone} label="Teléfono de contacto" value={user.phone} />
            <DataRow icon={GraduationCap} label="Carrera" value={user.career} />
            <DataRow icon={MapPin} label="Sede" value={user.campus} />
          </div>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-line bg-canvas p-4 text-xs text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <p>
              Tus datos solo se usan para la atención de tus tickets y la orientación en el campus.
              Puedes solicitar su actualización o eliminación en la mesa de ayuda.
            </p>
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <h2 className="text-sm font-semibold">Resumen de actividad</h2>
            <div className="mt-3 space-y-2">
              <Link
                to={ROUTES.tickets}
                className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5 text-sm transition hover:bg-brand-soft"
              >
                <span className="flex items-center gap-2 text-ink">
                  <Ticket className="h-4 w-4 text-brand" aria-hidden="true" />
                  Tickets activos
                </span>
                <span className="font-bold text-ink">{ticketsLoading && tickets.length === 0 ? '…' : openTickets}</span>
              </Link>
              <Link
                to={ROUTES.accessibility}
                className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5 text-sm transition hover:bg-brand-soft"
              >
                <span className="flex items-center gap-2 text-ink">
                  <Accessibility className="h-4 w-4 text-brand" aria-hidden="true" />
                  Accesibilidad
                </span>
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
              </Link>
              <Link
                to={ROUTES.faq}
                className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2.5 text-sm transition hover:bg-brand-soft"
              >
                <span className="flex items-center gap-2 text-ink">
                  <BookOpen className="h-4 w-4 text-brand" aria-hidden="true" />
                  Centro de ayuda
                </span>
                <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
              </Link>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Sesión</h2>
            <p className="mt-1 text-xs text-muted">
              En la Etapa 3 podrás gestionar dispositivos y cerrar sesión en todos ellos.
            </p>
            <Button
              variant="secondary"
              fullWidth
              className="mt-4"
              icon={LogOut}
              onClick={() => {
                void (async () => {
                  await logout();
                  navigate(ROUTES.login);
                })();
              }}
            >
              Cerrar sesión
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DataRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-line p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="break-words text-sm font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
