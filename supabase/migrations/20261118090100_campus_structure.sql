-- ============================================================
-- Camino UTP · 02 · Estructura del campus
-- campus 1:N edificios 1:N aulas 1:N indicaciones de ruta
-- Información pública de solo lectura para el catálogo del campus.
-- ============================================================

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{2,12}$'),
  name text not null check (char_length(btrim(name)) between 3 and 80),
  city text check (city is null or char_length(btrim(city)) between 2 and 80),
  address text check (address is null or char_length(btrim(address)) between 4 and 200),
  timezone text not null default 'America/Lima',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.campuses is 'Sedes de la universidad.';

create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9]{1,6}$'),
  name text not null check (char_length(btrim(name)) between 3 and 80),
  floors smallint not null default 1 check (floors between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campus_id, code)
);

comment on table public.buildings is 'Pabellones dentro de una sede.';
create index buildings_campus_idx on public.buildings (campus_id);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete restrict,
  code text not null unique check (code ~ '^[A-Z]{1,3}-?[0-9]{1,4}$'),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  floor smallint not null default 1 check (floor between 0 and 30),
  reference text check (reference is null or char_length(btrim(reference)) between 3 and 200),
  capacity smallint check (capacity is null or (capacity > 0 and capacity <= 1000)),
  map_x numeric(5, 2) check (map_x is null or map_x between 0 and 100),
  map_y numeric(5, 2) check (map_y is null or map_y between 0 and 100),
  equipment text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.classrooms is
  'Aulas y espacios. code es único en toda la universidad (incluye el pabellón).';
create index classrooms_building_idx on public.classrooms (building_id);
create index classrooms_active_idx on public.classrooms (is_active) where is_active;

create table public.classroom_directions (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  step_order smallint not null check (step_order between 1 and 20),
  instruction text not null check (char_length(btrim(instruction)) between 8 and 400),
  unique (classroom_id, step_order)
);

comment on table public.classroom_directions is
  'Pasos ordenados de la ruta hasta un aula. Reemplaza el arreglo del frontend.';
create index classroom_directions_classroom_idx
  on public.classroom_directions (classroom_id, step_order);

create trigger campuses_set_updated_at
  before update on public.campuses
  for each row execute function public.set_updated_at();

create trigger buildings_set_updated_at
  before update on public.buildings
  for each row execute function public.set_updated_at();

create trigger classrooms_set_updated_at
  before update on public.classrooms
  for each row execute function public.set_updated_at();

-- ------------------------- RLS -------------------------

alter table public.campuses enable row level security;
alter table public.buildings enable row level security;
alter table public.classrooms enable row level security;
alter table public.classroom_directions enable row level security;

-- El catálogo se puede leer sin sesión: es información pública del campus.
create policy campuses_public_read on public.campuses
  for select to anon, authenticated using (true);

create policy buildings_public_read on public.buildings
  for select to anon, authenticated using (true);

create policy classrooms_public_read on public.classrooms
  for select to anon, authenticated using (is_active);

create policy classrooms_admin_read on public.classrooms
  for select to authenticated using (public.is_admin());

create policy classroom_directions_public_read on public.classroom_directions
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.classrooms c
      where c.id = classroom_directions.classroom_id and c.is_active
    )
  );

create policy classroom_directions_admin_read on public.classroom_directions
  for select to authenticated using (public.is_admin());

-- Escritura del catálogo: solo administradores.
create policy campuses_admin_write on public.campuses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy buildings_admin_write on public.buildings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy classrooms_admin_write on public.classrooms
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy classroom_directions_admin_write on public.classroom_directions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
