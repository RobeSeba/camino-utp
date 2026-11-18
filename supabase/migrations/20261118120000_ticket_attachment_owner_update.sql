-- Permite al dueño del ticket registrar la ruta del adjunto después de subirlo a Storage.
-- Necesario porque la ruta incluye el id del ticket y la política de Storage exige que el ticket exista.
-- Seguro: solo el estudiante propietario puede establecer attachment_path una única vez (de NULL a valor).

create or replace function public.set_ticket_attachment(p_ticket_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'No autenticado.' using errcode = '42501';
  end if;

  if p_path is null or btrim(p_path) = '' then
    raise exception 'La ruta del adjunto no es válida.' using errcode = '22023';
  end if;

  if position(p_ticket_id::text || '/' in p_path) <> 1 then
    raise exception 'La ruta del adjunto debe pertenecer al ticket.' using errcode = '22023';
  end if;

  update public.tickets t
     set attachment_path = p_path,
         updated_at = now()
   where t.id = p_ticket_id
     and t.student_id = v_uid
     and t.attachment_path is null;

  if not found then
    raise exception 'No se pudo registrar el adjunto (ticket inexistente, ajeno o ya tiene adjunto).' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.set_ticket_attachment(uuid, text) from public;
grant execute on function public.set_ticket_attachment(uuid, text) to authenticated;
