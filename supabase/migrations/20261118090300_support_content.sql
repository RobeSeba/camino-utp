-- ============================================================
-- Camino UTP · 04 · Contenido de soporte
-- Categorías de ticket, artículos de ayuda, canales y avisos.
-- ============================================================

create table public.ticket_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null check (char_length(btrim(name)) between 3 and 80),
  description text check (description is null or char_length(btrim(description)) between 8 and 300),
  sla_hours smallint not null check (sla_hours between 1 and 720),
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ticket_categories is
  'Categorías de incidencia y su SLA (horas hábiles) de primera respuesta.';

create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (char_length(btrim(title)) between 5 and 160),
  excerpt text not null check (char_length(btrim(excerpt)) between 10 and 300),
  body text[] not null default '{}' check (cardinality(body) <= 40),
  category text not null check (char_length(btrim(category)) between 2 and 60),
  is_popular boolean not null default false,
  is_published boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.help_articles is
  'Base de conocimiento del centro de ayuda. body guarda los pasos en orden.';
create index help_articles_published_idx
  on public.help_articles (is_published, sort_order);

create table public.support_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 100),
  type public.support_channel_type not null,
  value text not null check (char_length(btrim(value)) between 3 and 200),
  hours text check (hours is null or char_length(btrim(hours)) between 3 and 120),
  description text check (description is null or char_length(btrim(description)) between 5 and 300),
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.support_channels is
  'Canales de atención del SAE (teléfono, correo, WhatsApp, oficina).';

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 5 and 140),
  body text not null check (char_length(btrim(body)) between 10 and 600),
  tag text check (tag is null or char_length(btrim(tag)) between 2 and 30),
  icon text check (icon is null or icon ~ '^[a-z0-9-]{2,30}$'),
  tone text not null default 'info' check (tone in ('brand', 'success', 'warning', 'danger', 'info', 'neutral')),
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > published_at)
);

comment on table public.announcements is
  'Avisos del campus mostrados en el inicio. Visibles mientras estén publicados y vigentes.';
create index announcements_visible_idx
  on public.announcements (is_published, published_at desc);

create trigger ticket_categories_set_updated_at
  before update on public.ticket_categories
  for each row execute function public.set_updated_at();

create trigger help_articles_set_updated_at
  before update on public.help_articles
  for each row execute function public.set_updated_at();

create trigger support_channels_set_updated_at
  before update on public.support_channels
  for each row execute function public.set_updated_at();

create trigger announcements_set_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

-- ------------------------- RLS -------------------------

alter table public.ticket_categories enable row level security;
alter table public.help_articles enable row level security;
alter table public.support_channels enable row level security;
alter table public.announcements enable row level security;

create policy ticket_categories_public_read on public.ticket_categories
  for select to anon, authenticated using (is_active);

create policy ticket_categories_admin_read on public.ticket_categories
  for select to authenticated using (public.is_admin());

create policy help_articles_public_read on public.help_articles
  for select to anon, authenticated using (is_published);

create policy help_articles_admin_read on public.help_articles
  for select to authenticated using (public.is_admin());

create policy support_channels_public_read on public.support_channels
  for select to anon, authenticated using (is_active);

create policy support_channels_admin_read on public.support_channels
  for select to authenticated using (public.is_admin());

create policy announcements_public_read on public.announcements
  for select to anon, authenticated
  using (is_published and published_at <= now() and (expires_at is null or expires_at > now()));

create policy announcements_admin_read on public.announcements
  for select to authenticated using (public.is_admin());

-- Categorías y canales: solo administración.
create policy ticket_categories_admin_write on public.ticket_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy support_channels_admin_write on public.support_channels
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Artículos y avisos: administración y personal SAE.
create policy help_articles_staff_write on public.help_articles
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy announcements_staff_write on public.announcements
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
