import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MessageSquarePlus, Ticket as TicketIcon, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { useTickets } from '@/context/TicketsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { fetchTicketCategories } from '@/services/content';
import { ROUTES, TICKET_PRIORITY_META, TICKET_STATUS_META } from '@/lib/constants';
import { cn, formatDateTime } from '@/lib/utils';
import type { Ticket, TicketCategory } from '@/types';

type Filter = 'all' | 'active' | 'closed';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'closed', label: 'Resueltos y cerrados' },
];

export function TicketsPage() {
  const { tickets, isLoading, error, refresh, deleteTicket } = useTickets();
  const { user } = useAuth();
  const canDeleteTickets = user?.role === 'student';
  const { notify } = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [ticketToDelete, setTicketToDelete] = useState<Ticket | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await fetchTicketCategories();
        if (active) setCategories(data);
      } catch {
        // Si falla, se mostrará "Sin categoría" como respaldo.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const sorted = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [tickets],
  );

  const counts = useMemo(
    () => ({
      all: sorted.length,
      active: sorted.filter((ticket) => ['open', 'in_review', 'waiting_user'].includes(ticket.status)).length,
      closed: sorted.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
    }),
    [sorted],
  );

  const closeDeleteModal = () => {
    if (!deletingTicketId) setTicketToDelete(null);
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    setDeletingTicketId(ticketToDelete.id);
    const result = await deleteTicket(ticketToDelete.id);
    setDeletingTicketId(null);

    if (!result.ok) {
      notify('No se pudo eliminar el ticket', result.error ?? 'Inténtalo nuevamente.', 'error');
      return;
    }

    notify(
      'Ticket eliminado',
      'Se retiró de tu lista. El SAE conservará el registro y su historial para fines de seguimiento y auditoría.',
      'success',
    );
    setTicketToDelete(null);
  };

  const visible = sorted.filter((ticket) => {
    if (filter === 'active') return ['open', 'in_review', 'waiting_user'].includes(ticket.status);
    if (filter === 'closed') return ['resolved', 'closed'].includes(ticket.status);
    return true;
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Mis tickets"
        description="Sigue el estado de tus reportes y continúa la conversación con el SAE."
        actions={
          <Link to={ROUTES.newTicket}>
            <Button icon={MessageSquarePlus}>Nuevo ticket</Button>
          </Link>
        }
      />

      {isLoading && tickets.length === 0 && (
        <div className="flex items-center justify-center py-16 text-muted" role="status" aria-live="polite">
          <Spinner className="h-5 w-5" />
          <span className="ml-3 text-sm">Cargando tus tickets…</span>
        </div>
      )}

      {!isLoading && error && tickets.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-danger">{error}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </Card>
      )}

      {(!isLoading || tickets.length > 0) && !(error && tickets.length === 0) && (
        <>
          <div
            className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1"
            role="tablist"
            aria-label="Filtrar tickets por estado"
          >
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                role="tab"
                aria-selected={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={cn(
                  'flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition',
                  filter === item.value
                    ? 'bg-brand-soft text-brand-ink'
                    : 'text-muted hover:bg-canvas hover:text-ink',
                )}
              >
                {item.label}
                <span className="ml-1.5 text-xs font-semibold opacity-70">{counts[item.value]}</span>
              </button>
            ))}
          </div>

          {error && tickets.length > 0 && (
            <div className="mb-4 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
              No se pudo actualizar la lista. Mostrando la última información disponible.
              <button type="button" className="ml-2 font-semibold underline" onClick={() => void refresh()}>
                Reintentar
              </button>
            </div>
          )}

          {visible.length === 0 ? (
            <EmptyState
              icon={TicketIcon}
              title={filter === 'all' ? 'Todavía no tienes tickets' : 'No hay tickets en este filtro'}
              description={
                filter === 'all'
                  ? 'Cuando reportes una incidencia aparecerá aquí con su código de seguimiento y estado.'
                  : 'Prueba con otro filtro o crea un nuevo reporte.'
              }
              action={
                <Link to={ROUTES.newTicket}>
                  <Button icon={MessageSquarePlus}>Crear un ticket</Button>
                </Link>
              }
            />
          ) : (
            <ul className="space-y-3">
              {visible.map((ticket) => {
                const status = TICKET_STATUS_META[ticket.status];
                const priority = TICKET_PRIORITY_META[ticket.priority];
                const categoryName = categories.find((item) => item.id === ticket.categoryId)?.name ?? 'Sin categoría';

                return (
                  <li key={ticket.id}>
                    <Card interactive padding="sm">
                      <div className="flex items-center gap-3">
                        <Link
                          to={ROUTES.ticket(ticket.code)}
                          className="block min-w-0 flex-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-muted">{ticket.code}</span>
                                <Badge tone={status.tone} withDot>
                                  {status.label}
                                </Badge>
                                <Badge tone={priority.tone}>Prioridad {priority.label.toLowerCase()}</Badge>
                              </div>
                              <h2 className="mt-2 text-sm font-semibold text-ink sm:text-base">
                                {ticket.subject}
                              </h2>
                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                                <span>{categoryName}</span>
                                {ticket.classroomCode && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>Aula {ticket.classroomCode}</span>
                                  </>
                                )}
                                <span aria-hidden="true">·</span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                  Actualizado {formatDateTime(ticket.updatedAt)}
                                </span>
                              </div>
                            </div>
                            <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted sm:block" aria-hidden="true" />
                          </div>
                        </Link>
                        {canDeleteTickets && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            className="shrink-0 text-danger hover:bg-danger-soft"
                            aria-label={`Eliminar ticket ${ticket.code}`}
                            onClick={() => setTicketToDelete(ticket)}
                          >
                            <span className="hidden sm:inline">Eliminar</span>
                          </Button>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Modal
        open={Boolean(ticketToDelete)}
        onClose={closeDeleteModal}
        title="Eliminar ticket"
        description="El ticket dejará de aparecer en tu lista, pero el SAE conservará el registro y su historial para fines de seguimiento y auditoría."
        footer={
          <>
            <Button variant="secondary" onClick={closeDeleteModal} disabled={Boolean(deletingTicketId)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              loading={Boolean(ticketToDelete && deletingTicketId === ticketToDelete.id)}
              disabled={!ticketToDelete || Boolean(deletingTicketId)}
              onClick={() => void handleDeleteTicket()}
            >
              Eliminar ticket
            </Button>
          </>
        }
      >
        {ticketToDelete && (
          <p className="text-sm text-muted">
            ¿Deseas retirar <strong className="text-ink">{ticketToDelete.code}</strong> — {ticketToDelete.subject} de tu lista?
          </p>
        )}
      </Modal>
    </div>
  );
}
