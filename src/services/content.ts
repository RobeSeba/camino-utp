import { supabase } from '@/lib/supabase';
import type { HelpArticle, SupportChannel, TicketCategory } from '@/types';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  tag: string | null;
  icon: string | null;
  tone: string;
}

export async function fetchTicketCategories(): Promise<TicketCategory[]> {
  const { data, error } = await supabase
    .from('ticket_categories')
    .select('id, slug, name, description, sla_hours, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    slaHours: Number(row.sla_hours ?? 24),
    description: (row.description as string | null) ?? '',
  }));
}

export async function fetchHelpArticles(): Promise<HelpArticle[]> {
  const { data, error } = await supabase
    .from('help_articles')
    .select('id, slug, title, excerpt, body, category, is_popular, sort_order')
    .eq('is_published', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    excerpt: row.excerpt as string,
    body: ((row.body as string[] | null) ?? []).filter(Boolean),
    category: row.category as string,
    popular: Boolean(row.is_popular),
  }));
}

export async function fetchSupportChannels(): Promise<SupportChannel[]> {
  const { data, error } = await supabase
    .from('support_channels')
    .select('id, name, type, value, hours, description, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    type: row.type as SupportChannel['type'],
    value: row.value as string,
    hours: (row.hours as string | null) ?? '',
    description: (row.description as string | null) ?? '',
  }));
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, body, tag, icon, tone')
    .order('published_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    body: row.body as string,
    tag: (row.tag as string | null) ?? null,
    icon: (row.icon as string | null) ?? null,
    tone: (row.tone as string | null) ?? 'info',
  }));
}
