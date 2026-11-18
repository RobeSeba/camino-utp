import type { Role, TicketPriority, TicketStatus } from '@/types';

export const ROUTES = {
  login: '/login',
  biometric: '/login/biometrico',
  recover: '/recuperar',
  home: '/app/inicio',
  classrooms: '/app/aulas',
  classroom: (id = ':classroomId') => `/app/aulas/${id}`,
  profile: '/app/perfil',
  profileEdit: '/app/perfil/editar',
  help: '/app/ayuda',
  faq: '/app/ayuda/faq',
  channels: '/app/ayuda/canales',
  tickets: '/app/tickets',
  newTicket: '/app/tickets/nuevo',
  ticket: (code = ':code') => `/app/tickets/${code}`,
  accessibility: '/app/accesibilidad',
  staff: '/app/staff',
} as const;

export const APP_NAME = 'Camino UTP';

export const ROLE_LABELS: Record<Role, string> = {
  student: 'Estudiante',
  staff: 'Personal SAE',
  admin: 'Administrador',
};

export const TICKET_STATUS_META: Record<
  TicketStatus,
  { label: string; tone: 'info' | 'warning' | 'success' | 'neutral' | 'danger' }
> = {
  open: { label: 'Abierto', tone: 'info' },
  in_review: { label: 'En revisión', tone: 'warning' },
  waiting_user: { label: 'Esperando tu respuesta', tone: 'warning' },
  resolved: { label: 'Resuelto', tone: 'success' },
  closed: { label: 'Cerrado', tone: 'neutral' },
};

export const TICKET_PRIORITY_META: Record<TicketPriority, { label: string; tone: 'neutral' | 'warning' | 'danger' }> = {
  low: { label: 'Baja', tone: 'neutral' },
  medium: { label: 'Media', tone: 'warning' },
  high: { label: 'Alta', tone: 'danger' },
};

export const FONT_SCALE_OPTIONS = [
  { value: 0.9, label: 'Pequeño', sample: 'A-' },
  { value: 1, label: 'Normal', sample: 'A' },
  { value: 1.125, label: 'Grande', sample: 'A+' },
  { value: 1.25, label: 'Muy grande', sample: 'A++' },
] as const;

export const DEMO_ACCOUNTS = [
  { email: 'estudiante@utp.edu.pe', password: 'CaminoUtp123!', role: 'student' as const },
  { email: 'sae@utp.edu.pe', password: 'CaminoUtp123!', role: 'staff' as const },
  { email: 'admin@utp.edu.pe', password: 'CaminoUtp123!', role: 'admin' as const },
];
