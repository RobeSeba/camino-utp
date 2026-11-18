-- ============================================================
-- Camino UTP · 05 · Tickets, conversación e historial
-- ============================================================

-- Código legible y correlativo: UTP-2026-001001
create sequence if not exists public.ticket_code_seq as bigint start with 1001;

create or replace function public.ticket_status_label(p_status public.ticket_status)
returns text
language sql
immutable
as $$
  select case p_status
    when 'open' then 'Abierto'
    when 'in_review' then 'En revisión'
    when 'waiting_user' then 'Esperando tu respuesta'
    when 'resolved' then 'Resuelto'
    when 'closed' then 'Cerrado'
  end;
$$;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  student_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.ticket_categories(id) on delete restrict,
  classroom_id uuid references public.classrooms(id) on delete set null,
  location_note text check (location_note is null or char_length(btrim(location_note)) between 3 and 160),
  subject text not null check (char_length(btrim(subject)) between 8 and 120),
  description text not null check (char_length(btrim(description)) between 20 and 4000),
  status public.ticket_status not null default 'open',
  priority public.ticket_priority not null default 'medium',
  assigned_to uuid references public.profiles(id) on delete set null,
  estimated_hours smallint not null default 24 check (estimated_hours between 1 and 720),
  attachment_path text,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tickets is
  'Incidencias reportadas por estudiantes. El código, el SLA y el estado inicial los asigna el servidor.';

create index tickets_student_idx on public.tickets (student_id, created_at desc);
create index tickets_status_idx on public.tickets (status, updated_at desc);
create index tickets_category_idx on public.tickets (category_id);
create index tickets_assigned_idx on public.tickets (assigned_to) where assigned_to is not null;

-- Normaliza los valores de entrada: código correlativo, SLA de la categoría y estado inicial.
create or replace function public.prepare_ticket_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sla smallint;
begin
  select c.sla_hours into v_sla
  from public.ticket_categories c
  where c.id = new.category_id and c.is_active;

  if v_sla is null then
    raise exception 'La categoría del ticket no existe o está inactiva.' using errcode = '23503';
  end if;

  new.code := 'UTP-'
    || to_char(timezone('America/Lima', now()), 'YYYY')
    || '-'
    || lpad(nextval('public.ticket_code_seq')::text, 6, '0');
  new.estimated_hours := v_sla;
  new.status := 'open';
  new.assigned_to := null;
  new.first_response_at := null;
  new.resolved_at := null;
  new.closed_at := null;

  return new;
end;
$$;

create trigger tickets_prepare_insert
  before insert on public.tickets
  for each row execute function public.prepare_ticket_insert();

create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

-- Registra hitos de resolución/cierre y los limpia si el ticket se reabre.
create or replace function public.sync_ticket_status_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'resolved' then
      new.resolved_at := coalesce(new.resolved_at, now());
      new.closed_at := null;
    elsif new.status = 'closed' then
      new.resolved_at := coalesce(new.resolved_at, now());
      new.closed_at := coalesce(new.closed_at, now());
    else
      new.resolved_at := null;
      new.closed_at := null;
    end if;
  end if;

  return new;
end;
$$;

create trigger tickets_sync_status_timestamps
  before update of status on public.tickets
  for each row execute function public.sync_ticket_status_timestamps();

-- ------------------------- Conversación -------------------------

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_role public.ticket_author_role not null,
  author_name text not null check (char_length(btrim(author_name)) between 2 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.ticket_messages is
  'Mensajes de la conversación. is_internal = true son notas internas del SAE.';

create index ticket_messages_ticket_idx on public.ticket_messages (ticket_id, created_at);

-- Valida autoría real (no confía en el cliente) y bloquea respuestas a tickets cerrados.
create or replace function public.guard_ticket_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_name text;
  v_status public.ticket_status;
  v_student uuid;
begin
  select t.status, t.student_id into v_status, v_student
  from public.tickets t
  where t.id = new.ticket_id;

  if v_status is null then
    raise exception 'El ticket no existe.' using errcode = '23503';
  end if;

  -- Sin JWT: service_role o procesos internos.
  if v_uid is null then
    return new;
  end if;

  select p.role, p.full_name into v_role, v_name
  from public.profiles p
  where p.id = v_uid;

  if v_role is null then
    raise exception 'El usuario no tiene perfil asociado.' using errcode = '42501';
  end if;

  if new.author_role = 'system' then
    raise exception 'El rol system solo lo usa el servidor.' using errcode = '42501';
  end if;

  if v_role = 'student' then
    if v_student <> v_uid then
      raise exception 'No puedes escribir en un ticket ajeno.' using errcode = '42501';
    end if;
    if new.author_role <> 'student' then
      raise exception 'El rol del mensaje no coincide con tu cuenta.' using errcode = '42501';
    end if;
    if new.is_internal then
      raise exception 'No puedes crear notas internas.' using errcode = '42501';
    end if;
    if v_status in ('resolved', 'closed') then
      raise exception 'El ticket está cerrado; crea uno nuevo para continuar.' using errcode = '42501';
    end if;
  else
    if new.author_role <> 'staff' then
      raise exception 'El rol del mensaje no coincide con tu cuenta.' using errcode = '42501';
    end if;
  end if;

  -- El autor y su nombre visible se toman del perfil, no del cliente.
  new.author_id := v_uid;
  new.author_name := v_name;

  return new;
end;
$$;

create trigger ticket_messages_guard
  before insert on public.ticket_messages
  for each row execute function public.guard_ticket_message();

create or replace function public.on_ticket_message_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tickets t
     set updated_at = now(),
         first_response_at = case
           when new.author_role = 'staff' and t.first_response_at is null then now()
           else t.first_response_at
         end
   where t.id = new.ticket_id;

  return null;
end;
$$;

create trigger ticket_messages_after_insert
  after insert on public.ticket_messages
  for each row execute function public.on_ticket_message_created();

-- ------------------------- Historial -------------------------

create table public.ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z_]{3,40}$'),
  label text not null check (char_length(btrim(label)) between 3 and 200),
  is_internal boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.ticket_events is
  'Bitácora del ticket. La escribe el servidor mediante triggers; el cliente solo la lee.';

create index ticket_events_ticket_idx on public.ticket_events (ticket_id, created_at);

create or replace function public.log_ticket_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_events (ticket_id, actor_id, event_type, label)
    values (new.id, new.student_id, 'created', 'Ticket registrado');
    return null;
  end if;

  if new.status is distinct from old.status then
    insert into public.ticket_events (ticket_id, actor_id, event_type, label, metadata)
    values (
      new.id,
      auth.uid(),
      'status_changed',
      'Estado actualizado a ' || public.ticket_status_label(new.status),
      jsonb_build_object('from', old.status, 'to', new.status)
    );
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into public.ticket_events (ticket_id, actor_id, event_type, label, metadata)
    values (
      new.id,
      auth.uid(),
      'assigned',
      case when new.assigned_to is null then 'Ticket sin asignar' else 'Ticket asignado al SAE' end,
      jsonb_build_object('from', old.assigned_to, 'to', new.assigned_to)
    );
  end if;

  if new.priority is distinct from old.priority then
    insert into public.ticket_events (ticket_id, actor_id, event_type, label, metadata)
    values (
      new.id,
      auth.uid(),
      'priority_changed',
      'Prioridad actualizada a ' || new.priority::text,
      jsonb_build_object('from', old.priority, 'to', new.priority)
    );
  end if;

  return null;
end;
$$;

create trigger tickets_after_insert
  after insert on public.tickets
  for each row execute function public.log_ticket_change();

create trigger tickets_after_update
  after update on public.tickets
  for each row execute function public.log_ticket_change();

-- ------------------------- RLS -------------------------

alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_events enable row level security;

-- Estudiante: solo sus tickets. SAE y administración: todos.
create policy tickets_read_own on public.tickets
  for select to authenticated
  using (student_id = (select auth.uid()));

create policy tickets_read_staff on public.tickets
  for select to authenticated using (public.is_staff());

-- El estudiante crea tickets a su nombre y siempre en estado inicial.
create policy tickets_insert_own on public.tickets
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and public.current_user_role() = 'student'
  );

-- Solo el SAE cambia estado, prioridad o asignación.
create policy tickets_update_staff on public.tickets
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Sin DELETE: los tickets se conservan para auditoría.

create policy ticket_messages_read_own on public.ticket_messages
  for select to authenticated
  using (
    (not is_internal or public.is_staff())
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and (t.student_id = (select auth.uid()) or public.is_staff())
    )
  );

create policy ticket_messages_insert_own on public.ticket_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (not is_internal or public.is_staff())
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and (t.student_id = (select auth.uid()) or public.is_staff())
    )
  );

-- Los mensajes no se editan ni se borran desde el cliente.

create policy ticket_events_read_own on public.ticket_events
  for select to authenticated
  using (
    (not is_internal or public.is_staff())
    and exists (
      select 1 from public.tickets t
      where t.id = ticket_events.ticket_id
        and (t.student_id = (select auth.uid()) or public.is_staff())
    )
  );
