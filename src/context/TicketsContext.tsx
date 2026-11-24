import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  addTicketMessage,
  createTicket as createTicketRecord,
  deleteOwnTicket as deleteOwnTicketRecord,
  fetchMyTickets,
  fetchTicketByCode,
  updateTicketStatus,
  type CreateTicketInput,
} from '@/services/tickets';
import type { Ticket, TicketStatus } from '@/types';

interface TicketsContextValue {
  tickets: Ticket[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getTicketDetail: (code: string) => Promise<Ticket | null>;
  createTicket: (input: CreateTicketInput) => Promise<{ ok: boolean; id?: string; code?: string; error?: string }>;
  addMessage: (ticketId: string, body: string) => Promise<{ ok: boolean; error?: string }>;
  updateStatus: (ticketId: string, status: TicketStatus) => Promise<{ ok: boolean; error?: string }>;
  deleteTicket: (ticketId: string) => Promise<{ ok: boolean; error?: string }>;
}

const TicketsContext = createContext<TicketsContextValue | null>(null);

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const lower = msg.toLowerCase();
  if (lower.includes('hide_own_ticket') || lower.includes('pgrst202')) {
    return 'La función de eliminación aún no está instalada en Supabase. Aplica la nueva migración y vuelve a intentarlo.';
  }
  if (lower.includes('row-level security') || lower.includes('permission') || lower.includes('42501') || lower.includes('not allowed')) {
    return 'No tienes permiso para realizar esta acción o el ticket ya no admite cambios.';
  }
  if (lower.includes('network') || lower.includes('fetch') || lower.includes('failed to fetch')) {
    return 'No pudimos conectarnos. Revisa tu conexión e inténtalo otra vez.';
  }
  if (lower.includes('violates') || lower.includes('invalid')) {
    return 'Algunos datos no son válidos. Revisa la información e inténtalo nuevamente.';
  }
  return 'Ocurrió un problema. Inténtalo nuevamente.';
}

export function TicketsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setTickets([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMyTickets();
      setTickets(data);
    } catch (err) {
      setError(friendlyError(err));
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getTicketDetail = useCallback(async (code: string): Promise<Ticket | null> => {
    try {
      return await fetchTicketByCode(code);
    } catch {
      return null;
    }
  }, []);

  const createTicket = useCallback(
    async (input: CreateTicketInput): Promise<{ ok: boolean; id?: string; code?: string; error?: string }> => {
      try {
        const created = await createTicketRecord(input);
        await refresh();
        return { ok: true, id: created.id, code: created.code };
      } catch (err) {
        return { ok: false, error: friendlyError(err) };
      }
    },
    [refresh],
  );

  const addMessage = useCallback(
    async (ticketId: string, body: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        await addTicketMessage(ticketId, body, 'student');
        await refresh();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: friendlyError(err) };
      }
    },
    [refresh],
  );

  const updateStatus = useCallback(
    async (ticketId: string, status: TicketStatus): Promise<{ ok: boolean; error?: string }> => {
      try {
        await updateTicketStatus(ticketId, status);
        await refresh();
        return { ok: true };
      } catch (err) {
        return { ok: false, error: friendlyError(err) };
      }
    },
    [refresh],
  );

  const deleteTicket = useCallback(async (ticketId: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      await deleteOwnTicketRecord(ticketId);
      // La RPC confirma que el ticket ya no es visible para el estudiante.
      setTickets((current) => current.filter((ticket) => ticket.id !== ticketId));
      setError(null);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyError(err) };
    }
  }, []);

  const value = useMemo<TicketsContextValue>(
    () => ({
      tickets,
      isLoading,
      error,
      refresh,
      getTicketDetail,
      createTicket,
      addMessage,
      updateStatus,
      deleteTicket,
    }),
    [tickets, isLoading, error, refresh, getTicketDetail, createTicket, addMessage, updateStatus, deleteTicket],
  );

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}

export function useTickets(): TicketsContextValue {
  const context = useContext(TicketsContext);
  if (!context) {
    throw new Error('useTickets debe usarse dentro de TicketsProvider');
  }
  return context;
}
