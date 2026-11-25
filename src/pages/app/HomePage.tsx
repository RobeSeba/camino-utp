import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Info,
  LifeBuoy,
  MapPin,
  Megaphone,
  MessageSquarePlus,
  Ticket as TicketIcon,
  Wifi,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CampusMap } from '@/components/CampusMap';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketsContext';
import { fetchClassroomByIdOrCode } from '@/services/campus';
import { fetchAnnouncements, type Announcement } from '@/services/content';
import { ROUTES, TICKET_STATUS_META } from '@/lib/constants';
import { cn, formatDateTime, formatLongDate } from '@/lib/utils';
import type { Classroom } from '@/types';

const NEXT_CLASS = {
  course: 'Arquitectura de Software',
  section: 'Sección 42920',
  time: '10:30 - 12:50',
  classroomCode: 'A-201',
  teacher: 'Kevin Salazar Ruiz',
};

const ANNOUNCEMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi,
  megaphone: Megaphone,
  info: Info,
  alert: AlertTriangle,
  warning: AlertTriangle,
  calendar: CalendarDays,
};

function announcementIcon(name: string | null): React.ComponentType<{ className?: string }> {
  if (!name) return Megaphone;
  return ANNOUNCEMENT_ICONS[name.toLowerCase()] ?? Megaphone;
}

export function HomePage() {
  const { user } = useAuth();
  const { tickets, isLoading: ticketsLoading } = useTickets();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingContent(true);
      try {
        const [room, anns] = await Promise.all([
          fetchClassroomByIdOrCode(NEXT_CLASS.classroomCode).catch(() => null),
          fetchAnnouncements().catch(() => [] as Announcement[]),
        ]);
        if (!active) return;
        setClassroom(room);
        setAnnouncements(anns);
      } finally {
        if (active) setLoadingContent(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const firstName = user?.fullName.split(' ')[0] ?? 'estudiante';
  const recentTickets = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 2),
    [tickets],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatLongDate(new Date())}
        title={`Hola, ${firstName}`}
        description={`${user?.career || 'Estudiante UTP'} · ${user?.campus || 'Sede Lima Centro'}`}
        actions={
          <Link to={ROUTES.accessibility}>
            <Button variant="secondary" size="sm">
              Ajustar accesibilidad
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Proxima clase */}
        <Card padding="none" className="overflow-hidden lg:col-span-2">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="min-w-0">
              <Badge tone="brand" withDot>
                Próxima clase
              </Badge>
              <h2 className="mt-3 text-xl font-bold sm:text-2xl">{NEXT_CLASS.course}</h2>
              <p className="mt-1 text-sm text-muted">
                {NEXT_CLASS.section} · Docente {NEXT_CLASS.teacher}
              </p>

              <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand" aria-hidden="true" />
                  <dt className="sr-only">Horario</dt>
                  <dd className="font-semibold text-ink">{NEXT_CLASS.time}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand" aria-hidden="true" />
                  <dt className="sr-only">Aula</dt>
                  <dd className="font-semibold text-ink">
                    {classroom
                      ? `${classroom.code} · ${classroom.siteName} · ${classroom.buildingName}`
                      : NEXT_CLASS.classroomCode}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  icon={MapPin}
                  onClick={() => navigate(ROUTES.classroom(classroom?.id ?? classroom?.code ?? NEXT_CLASS.classroomCode))}
                >
                  Cómo llegar
                </Button>
                <Link to={ROUTES.classrooms}>
                  <Button variant="secondary">Ver todas las aulas</Button>
                </Link>
              </div>
            </div>

            {classroom && (
              <CampusMap classroom={classroom} compact className="h-40 w-full shrink-0 sm:h-44 sm:w-52" />
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-line bg-canvas px-5 py-3 text-xs text-muted sm:px-6">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Recuerda llegar 10 minutos antes. La ruta guiada está disponible en el buscador de aulas.
          </div>
        </Card>

        {/* Ayuda destacada */}
        <Card padding="none" className="relative overflow-hidden bg-brand text-white">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"
            aria-hidden="true"
          />
          <div className="relative flex h-full flex-col p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <LifeBuoy className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-white">¿Necesitas ayuda?</h2>
            <p className="mt-1.5 text-sm text-white/85">
              Estamos aquí para resolver tus dudas y atender incidencias del campus.
            </p>
            <div className="mt-auto space-y-2 pt-6">
              <Link to={ROUTES.newTicket} className="block">
                <Button
                  fullWidth
                  icon={MessageSquarePlus}
                  className="border border-white/25 !bg-white !text-[#a50817] hover:!bg-white/90"
                >
                  Reportar incidencia
                </Button>
              </Link>
              <Link to={ROUTES.help} className="block">
                <Button
                  fullWidth
                  variant="ghost"
                  className="!text-white hover:!bg-white/10"
                  icon={ArrowRight}
                >
                  Ir al centro de ayuda
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Accesos rapidos */}
      <section aria-labelledby="accesos-rapidos">
        <h2 id="accesos-rapidos" className="mb-3 text-base font-semibold">
          Accesos rápidos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <QuickAction to={ROUTES.classrooms} icon={MapPin} title="Buscar aula" description="Encuentra pabellón, piso y referencia." />
          <QuickAction to={ROUTES.tickets} icon={TicketIcon} title="Mis tickets" description="Revisa el estado de tus reportes." />
          <QuickAction to={ROUTES.faq} icon={LifeBuoy} title="Preguntas frecuentes" description="Respuestas a las dudas más comunes." />
          <QuickAction to={ROUTES.channels} icon={MessageSquarePlus} title="Canales de atención" description="Teléfono, correo y oficina del SAE." />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Tickets recientes */}
        <section className="lg:col-span-2" aria-labelledby="tickets-recientes">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="tickets-recientes" className="text-base font-semibold">
              Tus tickets recientes
            </h2>
            <Link to={ROUTES.tickets} className="text-sm font-semibold text-brand hover:underline">
              Ver todos
            </Link>
          </div>

          {ticketsLoading && tickets.length === 0 ? (
            <Card className="flex items-center gap-3 text-sm text-muted">
              <Spinner className="h-4 w-4" /> Cargando tickets…
            </Card>
          ) : recentTickets.length === 0 ? (
            <Card className="text-center">
              <p className="text-sm font-medium text-ink">Aún no registraste tickets</p>
              <p className="mt-1 text-sm text-muted">
                Cuando reportes una incidencia aparecerá aquí con su código de seguimiento.
              </p>
              <Button className="mt-4" size="sm" onClick={() => navigate(ROUTES.newTicket)}>
                Crear mi primer ticket
              </Button>
            </Card>
          ) : (
            <ul className="space-y-3">
              {recentTickets.map((ticket) => {
                const status = TICKET_STATUS_META[ticket.status];
                return (
                  <li key={ticket.id}>
                    <Link to={ROUTES.ticket(ticket.code)} className="block">
                      <Card interactive padding="sm" className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted">{ticket.code}</p>
                          <p className="mt-1 truncate text-sm font-semibold text-ink">{ticket.subject}</p>
                          <p className="mt-1 text-xs text-muted">
                            Actualizado el {formatDateTime(ticket.updatedAt)}
                          </p>
                        </div>
                        <Badge tone={status.tone} withDot className="shrink-0">
                          {status.label}
                        </Badge>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Avisos */}
        <section aria-labelledby="avisos">
          <h2 id="avisos" className="mb-3 text-base font-semibold">
            Avisos del campus
          </h2>
          {loadingContent && announcements.length === 0 ? (
            <Card className="flex items-center gap-3 text-sm text-muted">
              <Spinner className="h-4 w-4" /> Cargando avisos…
            </Card>
          ) : announcements.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">No hay avisos publicados por el momento.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((item) => {
                const Icon = announcementIcon(item.icon);
                const brand = item.tone === 'brand' || item.tone === 'primary';
                return (
                  <Card key={item.id} padding="sm">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                          brand ? 'bg-brand-soft text-brand' : 'bg-info-soft text-info',
                        )}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{item.body}</p>
                        {item.tag && (
                          <Badge tone={brand ? 'brand' : 'info'} className="mt-2">
                            {item.tag}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link to={to}>
      <Card interactive padding="sm" className="group h-full">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-white">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 text-xs text-muted">{description}</p>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden="true" />
        </div>
      </Card>
    </Link>
  );
}
