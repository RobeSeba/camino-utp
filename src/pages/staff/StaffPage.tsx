import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Clock,
  Inbox,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  addTicketMessage,
  fetchAllTicketsForStaff,
  fetchStaffTicketByCode,
  updateTicketStatus,
  type TicketWithStudent,
} from '@/services/tickets';
import { fetchTicketCategories } from '@/services/content';
import { ROUTES, TICKET_PRIORITY_META, TICKET_STATUS_META } from '@/lib/constants';
import { cn, formatDateTime, normalize } from '@/lib/utils';
import type { TicketCategory, TicketStatus } from '@/types';

const STATUS_OPTIONS = (Object.keys(TICKET_STATUS_META) as TicketStatus[]).map((status) => ({
  value: status,
  label: TICKET_STATUS_META[status].label,
}));

export function StaffPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const [tickets, setTickets] = useState<TicketWithStudent[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [selected, setSelected] = useState<TicketWithStudent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  const loadTickets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [list, cats] = await Promise.all([fetchAllTicketsForStaff(), fetchTicketCategories().catch(() => [])]);
      setTickets(list);
      setCategories(cats);
      setSelectedCode((current) => {
        if (current && list.some((t) => t.code === current)) return current;
        return list[0]?.code ?? null;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const lower = msg.toLowerCase();
      if (lower.includes('permission') || lower.includes('row-level security') || lower.includes('42501')) {
        setError('No tienes permisos para ver la bandeja de tickets. Verifica tu rol de acceso.');
      } else {
        setError('No pudimos cargar los tickets. Inténtalo nuevamente.');
      }
      setTickets([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isStaff) return;
    void loadTickets(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff || !selectedCode) {
      setSelected(null);
      return;
    }
    let active = true;
    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const detail = await fetchStaffTicketByCode(selectedCode);
        if (active) setSelected(detail);
      } catch {
        // Respaldo: usar datos de la lista si falla el detalle.
        if (active) setSelected(tickets.find((t) => t.code === selectedCode) ?? null);
      } finally {
        if (active) setDetailLoading(false);
      }
    };
    void loadDetail();
    return () => {
      active = false;
    };
  }, [isStaff, selectedCode, tickets]);

  const visible = useMemo(() => {
    const term = normalize(query.trim());
    const sorted = [...tickets].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    if (!term) return sorted;
    return sorted.filter((ticket) =>
      normalize(
        `${ticket.code} ${ticket.subject} ${ticket.classroomCode ?? ''} ${ticket.studentName ?? ''}`,
      ).includes(term),
    );
  }, [tickets, query]);

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title="Bandeja SAE" description="Área restringida al personal del SAE." />
        <Card className="text-center" padding="lg">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning">
            <Lock className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-bold">No tienes permiso para ver esta sección</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            La bandeja de tickets está reservada al personal del Servicio de Atención al Estudiante.
            Si crees que deberías tener acceso, contacta al administrador.
          </p>
          <Link to={ROUTES.home} className="mt-5 inline-block">
            <Button>Volver al inicio</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const stats = {
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    review: tickets.filter((ticket) => ticket.status === 'in_review').length,
    waiting: tickets.filter((ticket) => ticket.status === 'waiting_user').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved' || ticket.status === 'closed').length,
  };

  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Sin categoría';

  const refreshSelected = async (code: string) => {
    const [list, detail] = await Promise.all([fetchAllTicketsForStaff(), fetchStaffTicketByCode(code)]);
    setTickets(list);
    setSelected(detail);
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selected) return;
    setStatusSaving(true);
    try {
      await updateTicketStatus(selected.id, status);
      await refreshSelected(selected.code);
      notify('Estado actualizado', `El ticket pasó a ${TICKET_STATUS_META[status].label}.`);
    } catch {
      notify('No se pudo actualizar el estado', 'Inténtalo nuevamente.', 'error');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleReply = async () => {
    if (!selected) return;
    if (reply.trim().length < 3) {
      notify('Mensaje muy corto', 'Escribe al menos 3 caracteres.', 'error');
      return;
    }
    setSending(true);
    try {
      await addTicketMessage(selected.id, reply, 'staff');
      setReply('');
      await refreshSelected(selected.code);
      notify('Respuesta enviada', 'El estudiante verá el mensaje en su ticket.');
    } catch {
      notify('No se pudo enviar la respuesta', 'Verifica el estado del ticket e inténtalo nuevamente.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Gestión"
        title="Bandeja SAE"
        description="Atiende los tickets de los estudiantes, actualiza su estado y responde la conversación."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void loadTickets(true)} disabled={loading}>
              Actualizar
            </Button>
            <Badge tone="brand" withDot>
              Sesión de personal
            </Badge>
          </div>
        }
      />

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted" role="status" aria-live="polite">
          <Spinner className="h-5 w-5" />
          <span className="ml-3 text-sm">Cargando tickets…</span>
        </div>
      )}

      {!loading && error && (
        <Card className="text-center">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void loadTickets(true)}>
            Reintentar
          </Button>
        </Card>
      )}

      {!loading && !error && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Abiertos" value={stats.open} tone="info" />
            <StatCard label="En revisión" value={stats.review} tone="warning" />
            <StatCard label="Esperando estudiante" value={stats.waiting} tone="warning" />
            <StatCard label="Resueltos" value={stats.resolved} tone="success" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
            <section aria-labelledby="lista-tickets">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="lista-tickets" className="text-base font-semibold">
                  Tickets ({visible.length})
                </h2>
              </div>
              <Input
                placeholder="Buscar por código, asunto, aula o estudiante…"
                icon={Search}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                containerClassName="mb-3"
              />

              {visible.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="Sin tickets"
                  description="No hay tickets que coincidan con la búsqueda."
                />
              ) : (
                <ul className="space-y-2">
                  {visible.map((ticket) => {
                    const status = TICKET_STATUS_META[ticket.status];
                    const isSelected = selectedCode === ticket.code;
                    return (
                      <li key={ticket.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedCode(ticket.code)}
                          aria-pressed={isSelected}
                          className={cn(
                            'w-full rounded-xl border p-3 text-left transition',
                            isSelected
                              ? 'border-brand bg-brand-soft'
                              : 'border-line bg-surface hover:border-brand',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-muted">{ticket.code}</span>
                            <Badge tone={status.tone} withDot>
                              {status.label}
                            </Badge>
                            {ticket.studentDeletedAt && (
                              <Badge tone="neutral">Retirado por estudiante</Badge>
                            )}
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-sm font-medium text-ink">
                            {ticket.subject}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {formatDateTime(ticket.updatedAt)}
                            {ticket.classroomCode && <span>· Aula {ticket.classroomCode}</span>}
                          </p>
                          {ticket.studentName && (
                            <p className="mt-0.5 text-xs text-muted">Solicitante: {ticket.studentName}</p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section aria-labelledby="detalle-ticket">
              <h2 id="detalle-ticket" className="mb-3 text-base font-semibold">
                Detalle del ticket
              </h2>

              {!selectedCode ? (
                <EmptyState
                  icon={ShieldAlert}
                  title="Selecciona un ticket"
                  description="Elige un ticket de la lista para ver su detalle y responder."
                />
              ) : detailLoading && !selected ? (
                <Card className="flex items-center justify-center py-12 text-muted">
                  <Spinner className="h-5 w-5" />
                  <span className="ml-3 text-sm">Cargando detalle…</span>
                </Card>
              ) : !selected ? (
                <EmptyState
                  icon={ShieldAlert}
                  title="No se pudo cargar el detalle"
                  description="Intenta seleccionar el ticket nuevamente."
                />
              ) : (
                <Card padding="none" className="overflow-hidden">
                  <div className="border-b border-line p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted">{selected.code}</span>
                      <Badge tone={TICKET_STATUS_META[selected.status].tone} withDot>
                        {TICKET_STATUS_META[selected.status].label}
                      </Badge>
                      <Badge tone={TICKET_PRIORITY_META[selected.priority].tone}>
                        {TICKET_PRIORITY_META[selected.priority].label}
                      </Badge>
                      <Link
                        to={ROUTES.ticket(selected.code)}
                        className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        Vista del estudiante
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                    <h3 className="mt-2 text-base font-semibold">{selected.subject}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {categoryName(selected.categoryId)}
                      {selected.classroomCode && <> · Aula {selected.classroomCode}</>}
                    </p>
                  </div>

                  <div className="space-y-4 p-4 sm:p-5">
                    <p className="whitespace-pre-line rounded-xl bg-canvas p-3 text-sm leading-relaxed text-muted">
                      {selected.description}
                    </p>

                    {selected.studentDeletedAt && (
                      <div className="rounded-xl border border-warning/30 bg-warning-soft p-3 text-sm text-warning">
                        El estudiante retiró este ticket de su lista el {formatDateTime(selected.studentDeletedAt)}. El registro y su historial se conservan para el SAE.
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        label="Cambiar estado"
                        name="status"
                        value={selected.status}
                        options={STATUS_OPTIONS}
                        disabled={statusSaving}
                        onChange={(event) => void handleStatusChange(event.target.value as TicketStatus)}
                      />
                      <div className="flex flex-col justify-end">
                        <p className="mb-1.5 text-sm font-medium text-ink">Solicitante</p>
                        <div className="flex h-11 items-center gap-2 rounded-xl border border-line px-3">
                          <Avatar name={selected.studentName ?? 'Estudiante'} size="sm" />
                          <span className="truncate text-sm text-ink">{selected.studentName ?? 'Estudiante'}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                        <MessageSquare className="h-4 w-4 text-brand" aria-hidden="true" />
                        Conversación ({selected.messages?.length ?? 0})
                      </h3>
                      {!selected.messages || selected.messages.length === 0 ? (
                        <p className="rounded-xl bg-canvas p-3 text-sm text-muted">
                          Sin mensajes. Envía la primera respuesta.
                        </p>
                      ) : (
                        <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                          {selected.messages.map((message) => (
                            <li
                              key={message.id}
                              className={cn(
                                'rounded-xl p-3 text-sm',
                                message.author === 'staff'
                                  ? 'bg-brand-soft'
                                  : 'border border-line bg-canvas',
                              )}
                            >
                              <p className="text-xs font-semibold text-ink">{message.authorName}</p>
                              <p className="mt-0.5 whitespace-pre-line text-muted">{message.body}</p>
                              <p className="mt-1 text-[11px] text-muted">
                                {formatDateTime(message.createdAt)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <Textarea
                      label="Responder al estudiante"
                      name="staff-reply"
                      rows={3}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder="Escribe una respuesta clara, con el siguiente paso o el plazo estimado…"
                      disabled={sending}
                    />
                    <div className="flex justify-end">
                      <Button icon={Send} loading={sending} onClick={() => void handleReply()}>
                        Enviar respuesta
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'info' | 'warning' | 'success';
}) {
  const styles = {
    info: 'bg-info-soft text-info',
    warning: 'bg-warning-soft text-warning',
    success: 'bg-success-soft text-success',
  } as const;

  return (
    <Card padding="sm">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={cn('mt-1 inline-flex min-w-9 items-center justify-center rounded-lg px-2 py-0.5 text-lg font-bold', styles[tone])}>
        {value}
      </p>
    </Card>
  );
}
