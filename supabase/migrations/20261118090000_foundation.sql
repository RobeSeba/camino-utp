-- ============================================================
-- Camino UTP · 01 · Fundaciones
-- Tipos enumerados, helpers de auditoría y funciones de rol.
-- ============================================================

create type public.user_role as enum ('student', 'staff', 'admin');
create type public.ticket_status as enum ('open', 'in_review', 'waiting_user', 'resolved', 'closed');
create type public.ticket_priority as enum ('low', 'medium', 'high');
create type public.ticket_author_role as enum ('student', 'staff', 'system');
create type public.support_channel_type as enum ('phone', 'email', 'whatsapp', 'office', 'chat');
create type public.theme_preference as enum ('light', 'dark', 'system');

-- Trigger genérico para mantener updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Actualiza updated_at en cada UPDATE de la tabla que lo use.';

-- Rol del usuario autenticado, leído desde su perfil.
-- SECURITY DEFINER evita la recursión de políticas sobre public.profiles.
create or replace function public.current_user_role()
returns public.user_role
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  select p.role into v_role
  from public.profiles p
  where p.id = auth.uid();

  return v_role;
end;
$$;

comment on function public.current_user_role() is
  'Devuelve el rol del usuario del JWT actual. NULL para anónimos o service_role.';

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('staff', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_user_role() = 'admin';
$$;

comment on function public.is_staff() is 'true si el usuario actual es personal SAE o administrador.';
comment on function public.is_admin() is 'true si el usuario actual es administrador.';
