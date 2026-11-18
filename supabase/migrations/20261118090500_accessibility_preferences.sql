-- ============================================================
-- Camino UTP · 06 · Preferencias de accesibilidad
-- 1:1 con el perfil, para sincronizar entre dispositivos.
-- ============================================================

create table public.accessibility_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  font_scale numeric(3, 2) not null default 1.00
    check (font_scale between 0.85 and 1.30),
  theme public.theme_preference not null default 'system',
  high_contrast boolean not null default false,
  reduce_motion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.accessibility_preferences is
  'Preferencias de lectura del usuario. Sustituyen al almacenamiento local del frontend.';

create trigger accessibility_preferences_set_updated_at
  before update on public.accessibility_preferences
  for each row execute function public.set_updated_at();

alter table public.accessibility_preferences enable row level security;

create policy accessibility_preferences_read_own on public.accessibility_preferences
  for select to authenticated using (user_id = (select auth.uid()));

create policy accessibility_preferences_insert_own on public.accessibility_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy accessibility_preferences_update_own on public.accessibility_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy accessibility_preferences_delete_own on public.accessibility_preferences
  for delete to authenticated using (user_id = (select auth.uid()));
