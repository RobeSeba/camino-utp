export type Role = 'student' | 'staff' | 'admin';

export interface Profile {
  id: string;
  fullName: string;
  studentCode: string;
  email: string;
  phone: string;
  career: string;
  campus: string;
  cycle: string;
  role: Role;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  shortName: string;
  address: string;
  lat: number;
  lng: number;
  campus: string;
}

export interface Building {
  id: string;
  code: string;
  name: string;
  floors: number;
  siteId: string;
  siteCode: string;
}

export interface Classroom {
  id: string;
  code: string;
  name: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  floor: number;
  campus: string;
  siteId: string;
  siteCode: string;
  siteName: string;
  siteAddress: string;
  siteLat: number;
  siteLng: number;
  reference: string;
  directions: string[];
  /** Posicion relativa (0-100) usada por el mapa esquematico de la sede. */
  mapX: number;
  mapY: number;
  capacity: number;
  equipment: string[];
}

export type TicketStatus = 'open' | 'in_review' | 'waiting_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface TicketCategory {
  id: string;
  name: string;
  slaHours: number;
  description: string;
}

export interface TicketMessage {
  id: string;
  author: 'student' | 'staff';
  authorName: string;
  body: string;
  createdAt: string;
}

export interface TicketEvent {
  id: string;
  label: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  code: string;
  subject: string;
  description: string;
  categoryId: string;
  classroomCode: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  estimatedHours: number;
  messages: TicketMessage[];
  events: TicketEvent[];
  attachmentName: string | null;
  /** Fecha en que el estudiante retiró el ticket de su lista; el SAE conserva el registro. */
  studentDeletedAt?: string | null;
  studentName?: string;
}

export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string[];
  category: string;
  popular: boolean;
}

export type ChannelType = 'phone' | 'email' | 'whatsapp' | 'office' | 'chat';

export interface SupportChannel {
  id: string;
  name: string;
  type: ChannelType;
  value: string;
  hours: string;
  description: string;
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface AccessibilityPreferences {
  fontScale: number;
  theme: ThemePreference;
  highContrast: boolean;
  reduceMotion: boolean;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'info';
}
