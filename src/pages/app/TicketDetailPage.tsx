import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Headphones,
  MessageSquare,
  Paperclip,
  Send,
  Ticket as TicketIcon,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useTickets } from '@/context/TicketsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { fetchTicketCategories } from '@/services/content';
import { ROUTES, TICKET_PRIORITY_META, TICKET_STATUS_META } from '@/lib/constants';
import { cn, formatDateTime } from '@/lib/utils';
import type { Ticket } from '@/types';

interface LocationState {
  justCreated?: boolean;
}

export function TicketDetailPage() {
  const { code = '' } = useParams<{ code: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { getTicketDetail, addMessage, refresh, deleteTicket } = useTickets();
  const { user } = useAuth();
  const canDeleteTicket = user?.role === 'student';
  const { notify } = useToast();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [categoryName, setCategoryName] = useState<string>('—');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const justCreated = Boolean((location.state as LocationState | null)?.justCreated);

  const load = async (showLoading = true) => {
    if (!code) {
      setTicket(null);
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    setLoadError(null);
    try {
      const [detail, categories] = await Promise.all([
        getTicketDetail(code),
        fetchTicketCategories().catch(() => []),
      ]);
      if (!detail) {
        setTicket(null);
      } else {
        setTicket(detail);
        const name = categories.find((c) => c.id === detail.categoryId)?.name;
        setCategoryName(name ?? 'Sin categoría');
      }
    } catch {
      setLoadError('No pudimos cargar el ticket. Inténtalo nuevamente.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow={code ? `Ticket ${code}` : 'Ticket'}
          title="Cargando ticket"
          backTo={{ to: ROUTES.tickets, label: 'Volver a mis tickets' }}
        />
        <div className="flex items-center justify-center py-16 text-muted" role="status" aria-live="polite">
          <Spinner className="h-5 w-5" />
          <span className="ml-3 text-sm">Cargando detalle…</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          eyebrow={code ? `Ticket ${code}` : 'Ticket'}
          title="No se pudo cargar el ticket"
          backTo={{ to: ROUTES.tickets, label: 'Volver a mis tickets' }}
        />
        <Card className="text-center">
          <p className="text-sm text-danger">{loadError}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={() => void load(true)}>Reintentar</Button>
            <Link to={ROUTES.tickets}><Button>Volver a mis tickets</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Ticket no encontrado"
          backTo={{ to: ROUTES.tickets, label: 'Volver a mis tickets' }}
        />
        <EmptyState
          icon={TicketIcon}
          title="No encontramos este ticket"
          description="Verifica el código de seguimiento o revisa que tengas acceso a este ticket."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to={ROUTES.tickets}>
                <Button variant="secondary">Ver mis tickets</Button>
              </Link>
              <Link to={ROUTES.newTicket}>
                <Button>Crear un ticket</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const status = TICKET_STATUS_META[ticket.status];
  const priority = TICKET_PRIORITY_META[ticket.priority];
  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed';
  const deadline = new Date(
    new Date(ticket.createdAt).getTime() + ticket.estimatedHours * 60 * 60 * 1000,
  ).toISOString();
  const attachmentLabel = ticket.attachmentName
    ? ticket.attachmentName.split('/').pop() ?? ticket.attachmentName
    : null;

  const handleDeleteTicket = async () => {
    if (!ticket) return;
    setDeleting(true);
    const result = await deleteTicket(ticket.id);
    setDeleting(false);

    if (!result.ok) {
      notify('No se pudo eliminar el ticket', result.error ?? 'Inténtalo nuevamente.', 'error');
      return;
    }

    notify(
      'Ticket eliminado',
      'Se retiró de tu lista. El SAE conservará el registro y su historial para fines de seguimiento y auditoría.',
      'success',
    );
    navigate(ROUTES.tickets, { replace: true });
  };

  const handleReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reply.trim().length < 3) {
      setReplyError('Escribe un mensaje de al menos 3 caracteres.');
      return;
    }
    setReplyError(null);
    setSending(true);
    const result = await addMessage(ticket.id, reply);
    setSending(false);
    if (!result.ok) {
      setReplyError(result.error ?? 'No se pudo enviar el mensaje. Inténtalo nuevamente.');
      notify('No se pudo enviar el mensaje', result.error ?? 'Inténtalo nuevamente.', 'error');
      return;
    }
    setReply('');
    notify('Mensaje enviado', 'Tu respuesta se agregó al ticket.', 'success');
    await Promise.all([load(false), refresh()]);
  };

  return (
    <div>
      <PageHeader
        eyebrow={`Ticket ${ticket.code}`}
        title={ticket.subject}
        description={`Registrado el ${formatDateTime(ticket.createdAt)}`}
        backTo={{ to: ROUTES.tickets, label: 'Volver a mis tickets' }}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canDeleteTicket && (
              <Button
                variant="ghost"
                size="sm"
                icon={Trash2}
                className="text-danger hover:bg-danger-soft"
                onClick={() => setDeleteModalOpen(true)}
              >
                Eliminar
              </Button>
            )}
            <Badge tone={status.tone} withDot>
              {status.label}
            </Badge>
            <Badge tone={priority.tone}>Prioridad {priority.label.toLowerCase()}</Badge>
          </div>
        }
      />

      {justCreated && (
        <Card className="mb-5 border-l-4 border-l-success bg-success-soft" padding="sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-ink">¡Ticket registrado!</p>
              <p className="mt-0.5 text-sm text-muted">
                Tu código de seguimiento es <span className="font-semibold text-ink">{ticket.code}</span>.
                Guarda este código para consultar el estado.
              </p>
              <p className="mt-1 text-xs text-muted">
                Primera respuesta estimada: hasta {ticket.estimatedHours} horas hábiles
                ({formatDateTime(deadline)}).
              </p>
            </div>
          </div>
        </Card>
      )}

      {ticket.status === 'waiting_user' && (
        <Card className="mb-5 border-l-4 border-l-warning bg-warning-soft" padding="sm">
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-ink">El SAE necesita tu respuesta</p>
              <p className="mt-0.5 text-sm text-muted">
                Revisa el último mensaje y responde para continuar con la atención.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">Detalle del reporte</h2>
              <Badge tone="neutral">{categoryName}</Badge>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
              {ticket.description}
            </p>

            {attachmentLabel && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm">
                <Paperclip className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="truncate text-ink">{attachmentLabel}</span>
                <span className="ml-auto shrink-0 text-xs text-muted">Adjunto</span>
              </div>
            )}

            <dl className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted">Categoría</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">{categoryName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Ubicación</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {ticket.classroomCode ? `Aula ${ticket.classroomCode}` : 'No especificada'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Última actualización</dt>
                <dd className="mt-0.5 text-sm font-medium text-ink">
                  {formatDateTime(ticket.updatedAt)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Conversacion */}
          <Card>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <MessageSquare className="h-4 w-4 text-brand" aria-hidden="true" />
              Conversación
            </h2>

            {ticket.messages.length === 0 ? (
              <p className="mt-3 rounded-xl bg-canvas p-4 text-sm text-muted">
                Aún no hay mensajes. El equipo SAE responderá en el plazo indicado.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {ticket.messages.map((message) => {
                  const isStaff = message.author === 'staff';
                  return (
                    <li key={message.id} className={cn('flex', isStaff ? 'justify-start' : 'justify-end')}>
                      <div
                        className={cn(
                          'max-w-[85%] rounded-2xl px-4 py-3',
                          isStaff
                            ? 'rounded-tl-sm border border-line bg-canvas'
                            : 'rounded-tr-sm bg-brand-soft',
                        )}
                      >
                        <p
                          className={cn(
                            'text-xs font-semibold',
                            isStaff ? 'text-brand' : 'text-brand-ink',
                          )}
                        >
                          {message.authorName}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm text-ink">{message.body}</p>
                        <p className="mt-1.5 text-[11px] text-muted">{formatDateTime(message.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {isClosed ? (
              <div className="mt-5 rounded-xl border border-line bg-canvas p-4">
                <p className="text-sm font-medium text-ink">Este ticket está {status.label.toLowerCase()}.</p>
                <p className="mt-1 text-sm text-muted">
                  Si el problema continúa, crea un nuevo ticket indicando el código anterior.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  icon={TicketIcon}
                  onClick={() => navigate(ROUTES.newTicket)}
                >
                  Crear nuevo ticket
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReply} className="mt-5 border-t border-line pt-4" noValidate>
                <Textarea
                  label="Responder al SAE"
                  name="reply"
                  value={reply}
                  onChange={(event) => {
                    setReply(event.target.value);
                    if (replyError) setReplyError(null);
                  }}
                  placeholder="Escribe tu mensaje o la información solicitada…"
                  error={replyError ?? undefined}
                  rows={3}
                  maxLength={500}
                />
                <div className="mt-3 flex justify-end">
                  <Button type="submit" icon={Send} loading={sending}>
                    Enviar mensaje
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <h2 className="text-sm font-semibold">Estado del ticket</h2>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted">Estado actual</span>
                <Badge tone={status.tone} withDot>
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted">Prioridad</span>
                <Badge tone={priority.tone}>{priority.label}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted">SLA</span>
                <span className="text-sm font-medium text-ink">{ticket.estimatedHours} h hábiles</span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-xl bg-canvas p-3 text-xs text-muted">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
              <p>
                Primera respuesta estimada antes del{' '}
                <span className="font-medium text-ink">{formatDateTime(deadline)}</span>.
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold">Historial</h2>
            {ticket.events.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Sin eventos registrados.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {ticket.events.map((event, index) => (
                  <li key={event.id} className="flex gap-2.5">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                          index === ticket.events.length - 1 ? 'bg-brand' : 'bg-line',
                        )}
                        aria-hidden="true"
                      />
                      {index < ticket.events.length - 1 && (
                        <span className="my-1 w-px flex-1 bg-line" aria-hidden="true" />
                      )}
                    </div>
                    <div className="pb-2">
                      <p className="text-sm text-ink">{event.label}</p>
                      <p className="text-xs text-muted">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <Headphones className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">¿Necesitas hablar con alguien?</h2>
                <p className="mt-1 text-sm text-muted">La mesa de ayuda atiende de 08:00 a 20:00.</p>
                <Link
                  to={ROUTES.channels}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
                >
                  Ver canales
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <Modal
        open={deleteModalOpen}
        onClose={() => { if (!deleting) setDeleteModalOpen(false); }}
        title="Eliminar ticket"
        description="El ticket dejará de aparecer en tu lista, pero el SAE conservará el registro y su historial para fines de seguimiento y auditoría."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" icon={Trash2} loading={deleting} onClick={() => void handleDeleteTicket()}>
              Eliminar ticket
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          ¿Deseas retirar <strong className="text-ink">{ticket.code}</strong> — {ticket.subject} de tu lista?
        </p>
      </Modal>
    </div>
  );
}
