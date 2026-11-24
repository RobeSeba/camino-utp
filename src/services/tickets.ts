import { supabase } from '@/lib/supabase';
import type { Ticket, TicketEvent, TicketMessage, TicketPriority, TicketStatus } from '@/types';

export interface CreateTicketInput {
  id?: string;
  studentId: string;
  subject: string;
  description: string;
  categoryId: string;
  classroomId: string | null;
  classroomCode: string | null;
  priority: TicketPriority;
  attachmentPath: string | null;
}

export interface CreatedTicket {
  id: string;
  code: string;
}

interface ClassroomRef {
  code?: string | null;
}

interface MessageRow {
  id: string;
  author_role: 'student' | 'staff' | 'system';
  author_name: string;
  body: string;
  created_at: string;
}

interface EventRow {
  id: string;
  label: string;
  created_at: string;
}

interface TicketRow {
  id: string;
  code: string;
  subject: string;
  description: string;
  category_id: string;
  classroom_id: string | null;
  location_note: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  created_at: string;
  updated_at: string;
  estimated_hours: number;
  attachment_path: string | null;
  student_deleted_at?: string | null;
  student_id?: string;
  classrooms?: ClassroomRef | ClassroomRef[] | null;
  ticket_messages?: MessageRow[] | null;
  ticket_events?: EventRow[] | null;
  profiles?: { full_name: string } | { full_name: string }[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapMessage(row: MessageRow): TicketMessage {
  return {
    id: row.id,
    author: row.author_role === 'staff' ? 'staff' : 'student',
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapEvent(row: EventRow): TicketEvent {
  return { id: row.id, label: row.label, createdAt: row.created_at };
}

function attachmentNameFromPath(path: string | null): string | null {
  if (!path) return null;
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function mapTicket(row: TicketRow): Ticket & { studentName?: string } {
  const classroom = first(row.classrooms);
  const profile = first(row.profiles);
  const messages = [...(row.ticket_messages ?? [])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(mapMessage);
  const events = [...(row.ticket_events ?? [])]
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map(mapEvent);

  return {
    id: row.id,
    code: row.code,
    subject: row.subject,
    description: row.description,
    categoryId: row.category_id,
    classroomCode: classroom?.code ?? row.location_note ?? null,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    estimatedHours: row.estimated_hours,
    messages,
    events,
    attachmentName: attachmentNameFromPath(row.attachment_path),
    studentDeletedAt: row.student_deleted_at ?? null,
    studentName: profile?.full_name,
  };
}

const TICKET_LIST_SELECT =
  'id, code, subject, description, category_id, classroom_id, location_note, status, priority, created_at, updated_at, estimated_hours, attachment_path, student_deleted_at, classrooms(code)';
const TICKET_DETAIL_SELECT =
  'id, code, student_id, subject, description, category_id, classroom_id, location_note, status, priority, created_at, updated_at, estimated_hours, attachment_path, student_deleted_at, classrooms(code), ticket_messages(id, author_role, author_name, body, created_at), ticket_events(id, label, created_at)';
const STAFF_TICKET_LIST_SELECT =
  'id, code, student_id, subject, description, category_id, classroom_id, location_note, status, priority, created_at, updated_at, estimated_hours, attachment_path, student_deleted_at, classrooms(code), profiles:student_id(full_name)';
const STAFF_TICKET_DETAIL_SELECT =
  'id, code, student_id, subject, description, category_id, classroom_id, location_note, status, priority, created_at, updated_at, estimated_hours, attachment_path, student_deleted_at, classrooms(code), profiles:student_id(full_name), ticket_messages(id, author_role, author_name, body, created_at), ticket_events(id, label, created_at)';

export type TicketWithStudent = Ticket & { studentName?: string };

export async function fetchMyTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(TICKET_LIST_SELECT)
    .is('student_deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as TicketRow[]).map((row) => mapTicket(row));
}

export async function fetchTicketByCode(code: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(TICKET_DETAIL_SELECT)
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTicket(data as unknown as TicketRow) : null;
}

export async function fetchAllTicketsForStaff(): Promise<TicketWithStudent[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select(STAFF_TICKET_LIST_SELECT)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as TicketRow[]).map((row) => mapTicket(row));
}

export async function fetchStaffTicketByCode(code: string): Promise<TicketWithStudent | null> {
  const { data, error } = await supabase
    .from('tickets')
    .select(STAFF_TICKET_DETAIL_SELECT)
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTicket(data as unknown as TicketRow) : null;
}

export async function createTicket(input: CreateTicketInput): Promise<CreatedTicket> {
  const payload: Record<string, unknown> = {
    student_id: input.studentId,
    category_id: input.categoryId,
    classroom_id: input.classroomId,
    location_note: input.classroomId ? null : (input.classroomCode || null),
    subject: input.subject.trim(),
    description: input.description.trim(),
    priority: input.priority,
    attachment_path: input.attachmentPath,
  };
  if (input.id) payload.id = input.id;

  const { data, error } = await supabase
    .from('tickets')
    .insert(payload)
    .select('id, code')
    .single();
  if (error) throw error;
  return { id: data.id as string, code: data.code as string };
}

export async function setTicketAttachment(ticketId: string, path: string): Promise<void> {
  // Intenta RPC (si existe) y, como alternativa, update directo (permitido para SAE).
  const rpc = await supabase.rpc('set_ticket_attachment', { p_ticket_id: ticketId, p_path: path });
  if (!rpc.error) return;
  const { error } = await supabase.from('tickets').update({ attachment_path: path }).eq('id', ticketId);
  if (error) throw rpc.error;
}

export async function addTicketMessage(ticketId: string, body: string, authorRole: 'student' | 'staff'): Promise<void> {
  const { error } = await supabase.from('ticket_messages').insert({
    ticket_id: ticketId,
    author_role: authorRole,
    author_name: 'Usuario', // El trigger lo reemplaza por el nombre real del perfil.
    body: body.trim(),
  });
  if (error) throw error;
}

/**
 * Retira un ticket de la lista del estudiante sin borrar el registro de auditoría.
 * La autorización se valida en la función SECURITY DEFINER de Supabase.
 */
export async function deleteOwnTicket(ticketId: string): Promise<void> {
  const { error } = await supabase.rpc('hide_own_ticket', { p_ticket_id: ticketId });
  if (error) throw error;
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  const { error } = await supabase.from('tickets').update({ status }).eq('id', ticketId);
  if (error) throw error;
}
