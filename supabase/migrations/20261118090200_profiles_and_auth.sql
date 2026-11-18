-- ============================================================
-- Camino UTP · 03 · Perfiles y autenticación
-- Extiende auth.users con los datos de negocio (1:1).
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 3 and 120),
  email text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  student_code text check (student_code is null or student_code ~ '^[A-Za-z0-9-]{4,20}$'),
  phone text check (phone is null or char_length(btrim(phone)) between 6 and 24),
  career text check (career is null or char_length(btrim(career)) between 3 and 120),
  campus_id uuid references public.campuses(id) on delete set null,
  cycle text check (cycle is null or char_length(btrim(cycle)) between 2 and 40),
  role public.user_role not null default 'student',
  avatar_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Datos de negocio del usuario, vinculados 1:1 con auth.users. Las contraseñas viven en Supabase Auth.';

create unique index profiles_email_key on public.profiles (lower(email));
create unique index profiles_student_code_key
  on public.profiles (upper(student_code))
  where student_code is not null;
create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crea el perfil automáticamente al registrarse en Supabase Auth.
-- El rol SIEMPRE nace como 'student': nunca se acepta desde metadatos.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(new.email, 'estudiante'), '@', 1)
  );

  -- La tabla exige entre 3 y 120 caracteres.
  if char_length(v_name) < 3 then
    v_name := 'Estudiante';
  elsif char_length(v_name) > 120 then
    v_name := left(v_name, 120);
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (new.id, v_name, lower(coalesce(new.email, 'sin-correo@utp.edu.pe')), 'student')
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene sincronizado el correo cuando cambia en auth.users.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = lower(new.email)
     where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Impide que un usuario eleve su propio rol o altere datos protegidos.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Sin JWT (service_role, migraciones, triggers internos): sin restricción.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Solo un administrador puede cambiar el rol de un usuario.'
      using errcode = '42501';
  end if;

  if new.student_code is distinct from old.student_code then
    raise exception 'El código de estudiante no es editable desde el perfil.'
      using errcode = '42501';
  end if;

  if new.email is distinct from old.email then
    raise exception 'El correo institucional se gestiona desde la universidad.'
      using errcode = '42501';
  end if;

  if new.is_active is distinct from old.is_active then
    raise exception 'No puedes cambiar el estado de tu cuenta.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ------------------------- RLS -------------------------

alter table public.profiles enable row level security;

-- El usuario ve su perfil; el personal SAE ve los perfiles para atender tickets.
create policy profiles_read_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy profiles_read_staff on public.profiles
  for select to authenticated using (public.is_staff());

-- El usuario actualiza solo su fila; el trigger protege rol, código, correo y estado.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Sin política de INSERT ni DELETE para clientes: el alta la hace el trigger de Auth
-- y la baja se gestiona con is_active o desde administración.
