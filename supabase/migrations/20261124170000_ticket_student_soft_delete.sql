-- ============================================================
-- Camino UTP · Retiro de tickets por el estudiante (eliminación lógica)
-- El estudiante oculta su ticket de su propia lista; el SAE conserva
-- el registro, la conversación, los adjuntos y la bitácora.
-- ============================================================

-- Marca temporal de retiro; no se elimina físicamente la fila.
alter table public.tickets
  add column if not exists student_deleted_at timestamptz;

comment on column public.tickets.student_deleted_at is
  'Fecha en que el estudiante retiró el ticket de su lista. El registro se conserva para auditoría y atención del SAE.';

create index if not exists tickets_student_visible_idx
  on public.tickets (student_id, updated_at desc)
  where student_deleted_at is null;

-- El estudiante solo puede consultar tickets que no haya retirado.
-- La política del SAE permanece intacta y le permite consultar todos.
drop policy if exists tickets_read_own on public.tickets;
create policy tickets_read_own on public.tickets
  for select to authenticated
  using (
    student_id = (select auth.uid())
    and student_deleted_at is null
  );

-- La operación se realiza mediante RPC SECURITY DEFINER para no conceder
-- UPDATE directo sobre tickets al estudiante. La función valida propietario y rol.
create or replace function public.hide_own_ticket(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión para retirar un ticket.' using errcode = '42501';
  end if;

  if public.current_user_role() is distinct from 'student'::public.user_role then
    raise exception 'Solo un estudiante puede retirar sus propios tickets.' using errcode = '42501';
  end if;

  update public.tickets t
     set student_deleted_at = now()
   where t.id = p_ticket_id
     and t.student_id = v_uid
     and t.student_deleted_at is null;

  if not found then
    raise exception 'No se encontró el ticket o no tienes permiso para retirarlo.' using errcode = '42501';
  end if;
end;
$$;

comment on function public.hide_own_ticket(uuid) is
  'Retira un ticket de la lista del estudiante propietario sin borrar el registro ni su historial.';

revoke all on function public.hide_own_ticket(uuid) from PUBLIC, anon, authenticated;
grant execute on function public.hide_own_ticket(uuid) to authenticated;

-- Registra el retiro en la bitácora para que el SAE pueda conocer el motivo
-- por el que el ticket ya no aparece en la lista del estudiante.
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

  if new.student_deleted_at is distinct from old.student_deleted_at
     and new.student_deleted_at is not null then
    insert into public.ticket_events (ticket_id, actor_id, event_type, label, metadata)
    values (
      new.id,
      auth.uid(),
      'student_hidden',
      'El estudiante retiró el ticket de su lista',
      jsonb_build_object('student_deleted_at', new.student_deleted_at)
    );
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

-- La función solo la invocan los triggers, no el cliente.
revoke all on function public.log_ticket_change() from PUBLIC, anon, authenticated;
