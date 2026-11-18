-- ============================================================
-- Camino UTP · 07 · Almacenamiento de adjuntos
-- Bucket privado + políticas sobre storage.objects.
-- Convención de ruta: <ticket_id>/<archivo>
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  false,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- El primer segmento de la ruta debe ser un UUID de ticket.
-- El CASE evita castear texto inválido a uuid.
create policy ticket_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1
      from public.tickets t
      where t.id = (
              case
                when name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
                  then split_part(name, '/', 1)::uuid
              end
            )
        and (t.student_id = (select auth.uid()) or public.is_staff())
    )
  );

create policy ticket_attachments_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1
      from public.tickets t
      where t.id = (
              case
                when name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
                  then split_part(name, '/', 1)::uuid
              end
            )
        and (
          (t.student_id = (select auth.uid()) and public.current_user_role() = 'student')
          or public.is_staff()
        )
    )
  );

-- Reemplazar un adjunto corregido: mismo alcance que la subida.
create policy ticket_attachments_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1
      from public.tickets t
      where t.id = (
              case
                when name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
                  then split_part(name, '/', 1)::uuid
              end
            )
        and (t.student_id = (select auth.uid()) or public.is_staff())
    )
  )
  with check (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1
      from public.tickets t
      where t.id = (
              case
                when name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
                  then split_part(name, '/', 1)::uuid
              end
            )
        and (t.student_id = (select auth.uid()) or public.is_staff())
    )
  );

create policy ticket_attachments_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1
      from public.tickets t
      where t.id = (
              case
                when name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/'
                  then split_part(name, '/', 1)::uuid
              end
            )
        and (t.student_id = (select auth.uid()) or public.is_staff())
    )
  );
