-- ============================================================
-- Camino UTP · 08 · Privilegios explícitos
-- RLS decide qué filas ve cada quien; estos GRANT deciden qué
-- operaciones llegan siquiera a evaluar la política.
-- ============================================================

-- Todo acceso anónimo parte de cero.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

-- ------------------------- Catálogo público -------------------------

grant select on public.campuses to anon, authenticated;
grant select on public.buildings to anon, authenticated;
grant select on public.classrooms to anon, authenticated;
grant select on public.classroom_directions to anon, authenticated;
grant select on public.ticket_categories to anon, authenticated;
grant select on public.help_articles to anon, authenticated;
grant select on public.support_channels to anon, authenticated;
grant select on public.announcements to anon, authenticated;

-- La escritura llega a la política, que exige is_admin()/is_staff().
grant insert, update, delete on public.campuses to authenticated;
grant insert, update, delete on public.buildings to authenticated;
grant insert, update, delete on public.classrooms to authenticated;
grant insert, update, delete on public.classroom_directions to authenticated;
grant insert, update, delete on public.ticket_categories to authenticated;
grant insert, update, delete on public.help_articles to authenticated;
grant insert, update, delete on public.support_channels to authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- ------------------------- Perfiles -------------------------

grant select, update on public.profiles to authenticated;
grant insert, delete on public.profiles to authenticated;

-- ------------------------- Tickets -------------------------

grant select, insert, update on public.tickets to authenticated;
grant select, insert on public.ticket_messages to authenticated;
grant select on public.ticket_events to authenticated;

-- ------------------------- Accesibilidad -------------------------

grant select, insert, update, delete on public.accessibility_preferences to authenticated;

-- La secuencia solo se usa dentro de prepare_ticket_insert() (SECURITY DEFINER).
revoke all on sequence public.ticket_code_seq from anon, authenticated;

-- ------------------------- Funciones -------------------------

-- Por defecto PostgreSQL permite EXECUTE a PUBLIC. Se revoca todo y se
-- vuelve a conceder únicamente lo que el cliente necesita.
revoke all on function public.set_updated_at() from PUBLIC, anon, authenticated;
revoke all on function public.handle_new_user() from PUBLIC, anon, authenticated;
revoke all on function public.handle_user_email_change() from PUBLIC, anon, authenticated;
revoke all on function public.guard_profile_update() from PUBLIC, anon, authenticated;
revoke all on function public.prepare_ticket_insert() from PUBLIC, anon, authenticated;
revoke all on function public.sync_ticket_status_timestamps() from PUBLIC, anon, authenticated;
revoke all on function public.guard_ticket_message() from PUBLIC, anon, authenticated;
revoke all on function public.on_ticket_message_created() from PUBLIC, anon, authenticated;
revoke all on function public.log_ticket_change() from PUBLIC, anon, authenticated;

revoke all on function public.current_user_role() from PUBLIC, anon, authenticated;
revoke all on function public.is_staff() from PUBLIC, anon, authenticated;
revoke all on function public.is_admin() from PUBLIC, anon, authenticated;
revoke all on function public.ticket_status_label(public.ticket_status) from PUBLIC, anon, authenticated;

-- Necesarias para evaluar las políticas RLS del propio usuario.
grant execute on function public.current_user_role() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.ticket_status_label(public.ticket_status) to anon, authenticated;
