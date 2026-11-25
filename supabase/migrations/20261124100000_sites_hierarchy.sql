-- ============================================================
-- Camino UTP · 10 · Sedes dentro de Lima Centro
-- campus (Lima Centro) 1:N sites 1:N buildings 1:N classrooms
-- Antes:pabellones y aulas colgaban directamente de Lima Centro.
-- Ahora:cada aula pertenece a una sede y a un pabellón de esa sede.
-- ============================================================

-- Algunas bases se crearon con el nombre anterior del campus. Se normaliza
-- antes de insertar las sedes; se respeta el mismo id para no romper perfiles.
update public.campuses
set code = 'LIMA-CENTRO', name = 'Sede Lima Centro'
where code = 'LIMA-SUR'
  and not exists (select 1 from public.campuses where code = 'LIMA-CENTRO');

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  code text not null check (code ~ '^[A-Z0-9-]{2,16}$'),
  name text not null check (char_length(btrim(name)) between 3 and 100),
  short_name text not null check (char_length(btrim(short_name)) between 2 and 40),
  address text check (address is null or char_length(btrim(address)) between 4 and 200),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campus_id, code)
);

comment on table public.sites is
  'Sedes dentro de un campus. Lima Centro contiene Sede Central, Torre Arequipa, Torre Petit Thouars y Torre Pacífico.';

drop trigger if exists sites_set_updated_at on public.sites;
create trigger sites_set_updated_at
  before update on public.sites
  for each row execute function public.set_updated_at();

-- ------------------------- Sedes de Lima Centro -------------------------

insert into public.sites (campus_id, code, name, short_name, address, lat, lng, sort_order)
select c.id, v.code, v.name, v.short_name, v.address, v.lat, v.lng, v.sort_order
from (
  values
    ('CENTRAL', 'Sede Central · Hernán Velarde', 'Hernán Velarde',
     'Jr. Hernán Velarde 289 / Av. Petit Thouars 116, Cercado de Lima',
     -12.0653580, -77.0368152, 1),
    ('AREAQUIPA', 'Torre Arequipa', 'Torre Arequipa',
     'Av. Arequipa 265, Santa Beatriz, Lima',
     -12.0660957, -77.0368976, 2),
    ('PETIT', 'Torre Petit Thouars', 'Petit Thouars',
     'Av. Petit Thouars 385, Santa Beatriz, Lima',
     -12.0675274, -77.0356446, 3),
    ('PACIFICO', 'Torre Pacífico', 'Pacífico',
     'Av. Arequipa 660, Santa Beatriz, Lima',
     -12.0707720, -77.0368520, 4)
) as v(code, name, short_name, address, lat, lng, sort_order)
join public.campuses c on c.code = 'LIMA-CENTRO'
on conflict (campus_id, code) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      address = excluded.address,
      lat = excluded.lat,
      lng = excluded.lng,
      sort_order = excluded.sort_order;

-- ------------------------- Pabellones por sede -------------------------

alter table public.buildings add column if not exists site_id uuid;

-- Los pabellones existentes (A-D) pertenecen a la Sede Central.
update public.buildings b
set site_id = s.id
from public.sites s
join public.campuses c on c.id = s.campus_id
where c.code = 'LIMA-CENTRO' and s.code = 'CENTRAL' and b.site_id is null;

alter table public.buildings alter column site_id set not null;
alter table public.buildings drop constraint if exists buildings_site_id_fkey;
alter table public.buildings
  add constraint buildings_site_id_fkey
  foreign key (site_id) references public.sites(id) on delete restrict;

alter table public.buildings drop constraint if exists buildings_campus_id_code_key;
alter table public.buildings drop constraint if exists buildings_code_check;
alter table public.buildings
  add constraint buildings_code_check check (code ~ '^[A-Z]{1,4}(-[A-Z]{1,4})?$');
alter table public.buildings drop constraint if exists buildings_site_id_code_key;
alter table public.buildings add constraint buildings_site_id_code_key unique (site_id, code);
create index if not exists buildings_site_idx on public.buildings (site_id);

insert into public.buildings (campus_id, site_id, code, name, floors)
select c.id, s.id, v.code, v.name, v.floors
from (
  values
    ('AREAQUIPA', 'AR-A', 'Pabellón AR-A', 12),
    ('AREAQUIPA', 'AR-B', 'Pabellón AR-B', 14),
    ('PETIT', 'PT-A', 'Pabellón PT-A', 16),
    ('PETIT', 'PT-B', 'Pabellón PT-B', 12),
    ('PACIFICO', 'PC-A', 'Pabellón PC-A', 10),
    ('PACIFICO', 'PC-B', 'Pabellón PC-B', 12)
) as v(site_code, code, name, floors)
join public.sites s on s.code = v.site_code
join public.campuses c on c.id = s.campus_id
on conflict (site_id, code) do update
  set name = excluded.name,
      floors = excluded.floors;

-- ------------------------- Aulas por sede -------------------------

alter table public.classrooms add column if not exists site_id uuid;

-- Las aulas existentes heredan la sede de su pabellón.
update public.classrooms cl
set site_id = b.site_id
from public.buildings b
where b.id = cl.building_id and cl.site_id is null;

alter table public.classrooms alter column site_id set not null;
alter table public.classrooms drop constraint if exists classrooms_site_id_fkey;
alter table public.classrooms
  add constraint classrooms_site_id_fkey
  foreign key (site_id) references public.sites(id) on delete restrict;
create index if not exists classrooms_site_idx on public.classrooms (site_id);

-- El prefijo del código identifica la sede cuando no es la Sede Central.
alter table public.classrooms drop constraint if exists classrooms_code_check;
alter table public.classrooms
  add constraint classrooms_code_check check (code ~ '^[A-Z]{1,4}(-[A-Z]{1,4})*-?[0-9]{1,4}$');

comment on table public.classrooms is
  'Aulas y espacios. code es único; el prefijo identifica la sede (A-201 = Sede Central, AR-A-101 = Torre Arequipa).';

insert into public.classrooms (
  site_id, building_id, code, name, floor, reference, capacity, map_x, map_y, equipment
)
select s.id, b.id, v.code, v.name, v.floor, v.reference, v.capacity, v.map_x, v.map_y, v.equipment
from (
  values
    ('AREAQUIPA', 'AR-A', 'AR-A-101', 'Auditorio Torre Arequipa', 1,
     'Piso 1, junto a la recepción de la torre', 90, 26.00, 36.00,
     array['Proyector', 'Sonido', 'Aire acondicionado']),
    ('AREAQUIPA', 'AR-A', 'AR-A-201', 'Aula AR-A-201', 2,
     'Segundo piso, ala norte', 42, 34.00, 28.00,
     array['Proyector', 'Pizarra acrílica']),
    ('AREAQUIPA', 'AR-B', 'AR-B-301', 'Laboratorio AR-B-301', 3,
     'Tercer piso, cerca de ascensores', 32, 70.00, 40.00,
     array['Computadoras', 'Red cableada', 'Proyector']),

    ('PETIT', 'PT-A', 'PT-A-102', 'Aula PT-A-102', 1,
     'Piso 1, junto al hall principal', 38, 30.00, 34.00,
     array['Proyector', 'Pizarra acrílica']),
    ('PETIT', 'PT-B', 'PT-B-203', 'Aula PT-B-203', 2,
     'Segundo piso, ala este', 40, 68.00, 64.00,
     array['Proyector', 'Pizarra acrílica']),
    ('PETIT', 'PT-B', 'PT-B-305', 'Sala de estudio PT-B-305', 3,
     'Tercer piso, zona de silencio', 24, 74.00, 58.00,
     array['Enchufes', 'Wi-Fi', 'Mesas grupales']),

    ('PACIFICO', 'PC-A', 'PC-A-101', 'Auditorio Torre Pacífico', 1,
     'Piso 1, acceso desde Av. Arequipa', 80, 28.00, 38.00,
     array['Proyector', 'Sonido']),
    ('PACIFICO', 'PC-B', 'PC-B-204', 'Laboratorio PC-B-204', 2,
     'Segundo piso, ala sur', 30, 70.00, 62.00,
     array['Computadoras', 'Proyector']),
    ('PACIFICO', 'PC-B', 'PC-B-401', 'Aula PC-B-401', 4,
     'Cuarto piso, junto a la escalera', 36, 76.00, 54.00,
     array['Proyector', 'Pizarra acrílica'])
) as v(site_code, building_code, code, name, floor, reference, capacity, map_x, map_y, equipment)
join public.sites s on s.code = v.site_code
join public.buildings b on b.site_id = s.id and b.code = v.building_code
on conflict (code) do update
  set site_id = excluded.site_id,
      building_id = excluded.building_id,
      name = excluded.name,
      floor = excluded.floor,
      reference = excluded.reference,
      capacity = excluded.capacity,
      map_x = excluded.map_x,
      map_y = excluded.map_y,
      equipment = excluded.equipment;

-- ------------------------- Rutas paso a paso -------------------------

-- Las rutas de la Sede Central ahora empiezan indicando la sede correcta.
update public.classroom_directions d
set instruction = v.instruction
from (
  values
    ('A-101', 'Llega a la Sede Central · Hernán Velarde (Jr. Hernán Velarde 289) y entra por la recepción principal.'),
    ('A-201', 'Llega a la Sede Central · Hernán Velarde, ingresa al Pabellón A y toma la escalera central al piso 2.'),
    ('A-305', 'Llega a la Sede Central · Hernán Velarde, entra al Pabellón A y sube al piso 3.'),
    ('B-102', 'Llega a la Sede Central · Hernán Velarde y cruza el patio hacia el Pabellón B.'),
    ('B-204', 'Llega a la Sede Central · Hernán Velarde, entra al Pabellón B y sube al piso 2.'),
    ('B-301', 'Llega a la Sede Central · Hernán Velarde, entra al Pabellón B y sube al piso 3.'),
    ('C-101', 'Llega a la Sede Central · Hernán Velarde y dirígete al Pabellón C, acceso oeste.'),
    ('C-205', 'Llega a la Sede Central · Hernán Velarde, entra al Pabellón C y sube al piso 2.'),
    ('C-402', 'Llega a la Sede Central · Hernán Velarde, entra al Pabellón C y toma el ascensor al piso 4.'),
    ('D-105', 'Llega a la Sede Central · Hernán Velarde y usa el acceso lateral del Pabellón D.'),
    ('D-203', 'Llega a la Sede Central · Hernán Velarde, entra al Pabellón D y sube al piso 2.'),
    ('D-401', 'Llega a la Sede Central · Hernán Velarde, entra al Pabellón D y toma el ascensor al piso 4.')
) as v(code, instruction)
join public.classrooms c on c.code = v.code
where d.classroom_id = c.id and d.step_order = 1;

insert into public.classroom_directions (classroom_id, step_order, instruction)
select c.id, v.step_order, v.instruction
from (
  values
    ('AR-A-101', 1, 'Llega a la Torre Arequipa (Av. Arequipa 265) y entra por la recepción del Pabellón AR-A.'),
    ('AR-A-101', 2, 'El auditorio está en el piso 1, al final del pasillo principal.'),
    ('AR-A-101', 3, 'Busca la puerta con la placa "Auditorio Torre Arequipa".'),

    ('AR-A-201', 1, 'Llega a la Torre Arequipa (Av. Arequipa 265), entra al Pabellón AR-A y sube al piso 2.'),
    ('AR-A-201', 2, 'Camina por el pasillo norte hasta la segunda puerta.'),
    ('AR-A-201', 3, 'El aula AR-A-201 está junto a la vitrina de avisos.'),

    ('AR-B-301', 1, 'Llega a la Torre Arequipa (Av. Arequipa 265), cruza al Pabellón AR-B y sube al piso 3.'),
    ('AR-B-301', 2, 'Sigue el pasillo hacia los ascensores y gira a la derecha.'),
    ('AR-B-301', 3, 'El laboratorio AR-B-301 tiene acceso con lector de tarjeta.'),

    ('PT-A-102', 1, 'Llega a la Torre Petit Thouars (Av. Petit Thouars 385) y entra al Pabellón PT-A por el hall principal.'),
    ('PT-A-102', 2, 'El aula está en el piso 1, a mano derecha después de la recepción.'),
    ('PT-A-102', 3, 'Busca la puerta señalizada con el código PT-A-102.'),

    ('PT-B-203', 1, 'Llega a la Torre Petit Thouars (Av. Petit Thouars 385), cruza al Pabellón PT-B y sube al piso 2.'),
    ('PT-B-203', 2, 'Camina hacia el ala este y pasa la sala de profesores.'),
    ('PT-B-203', 3, 'El aula PT-B-203 es la tercera puerta del pasillo.'),

    ('PT-B-305', 1, 'Llega a la Torre Petit Thouars (Av. Petit Thouars 385), entra al Pabellón PT-B y sube al piso 3.'),
    ('PT-B-305', 2, 'Sigue hasta la zona de silencio, al final del pasillo.'),
    ('PT-B-305', 3, 'La sala PT-B-305 está junto a la ventana panorámica.'),

    ('PC-A-101', 1, 'Llega a la Torre Pacífico (Av. Arequipa 660) y entra al Pabellón PC-A desde Av. Arequipa.'),
    ('PC-A-101', 2, 'El auditorio está en el piso 1, frente a la recepción.'),
    ('PC-A-101', 3, 'Busca la puerta doble con el letrero "Auditorio Torre Pacífico".'),

    ('PC-B-204', 1, 'Llega a la Torre Pacífico (Av. Arequipa 660), cruza al Pabellón PC-B y sube al piso 2.'),
    ('PC-B-204', 2, 'Toma el pasillo sur y pasa los servicios higiénicos.'),
    ('PC-B-204', 3, 'El laboratorio PC-B-204 es la segunda puerta.'),

    ('PC-B-401', 1, 'Llega a la Torre Pacífico (Av. Arequipa 660), entra al Pabellón PC-B y sube al piso 4 por ascensor.'),
    ('PC-B-401', 2, 'Al salir, gira a la izquierda y camina 15 metros.'),
    ('PC-B-401', 3, 'El aula PC-B-401 está junto a la escalera de emergencia.')
) as v(code, step_order, instruction)
join public.classrooms c on c.code = v.code
on conflict (classroom_id, step_order) do update
  set instruction = excluded.instruction;

-- ------------------------- Privilegios y RLS -------------------------

-- La migracion de privilegios revoca el acceso a anon/authenticated, asi que
-- las tablas nuevas necesitan GRANT explicito para que el catálogo funcione.
grant select on public.sites to anon, authenticated;
grant insert, update, delete on public.sites to authenticated;

alter table public.sites enable row level security;

drop policy if exists sites_public_read on public.sites;
create policy sites_public_read on public.sites
  for select to anon, authenticated using (true);

drop policy if exists sites_admin_write on public.sites;
create policy sites_admin_write on public.sites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
