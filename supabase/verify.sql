-- ============================================================
-- Camino UTP · Verificación del esquema aplicado
-- Uso: npx supabase db query --file supabase/verify.sql
-- No modifica datos.
-- ============================================================

-- 1. Tablas del esquema público con conteo de columnas.
select t.table_name,
       count(c.column_name)::int as columnas,
       bool_or(t.table_type = 'BASE TABLE') as es_tabla
from information_schema.tables t
join information_schema.columns c
  on c.table_schema = t.table_schema and c.table_name = t.table_name
where t.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
group by t.table_name
order by t.table_name;

-- 2. Claves primarias y foráneas.
select tc.table_name,
       tc.constraint_type,
       tc.constraint_name,
       kcu.column_name,
       ccu.table_name as tabla_referenciada,
       ccu.column_name as columna_referenciada
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.constraint_schema = tc.constraint_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.constraint_schema = tc.constraint_schema
where tc.table_schema = 'public'
  and tc.constraint_type in ('PRIMARY KEY', 'FOREIGN KEY')
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- 3. RLS activo y cantidad de políticas por tabla.
select c.relname as tabla,
       c.relrowsecurity as rls_activo,
       count(p.policyname)::int as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by c.relname;

-- 4. Políticas por tabla y operación.
select tablename,
       policyname,
       cmd,
       array_to_string(roles, ',') as roles
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 5. Índices del esquema público.
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 6. Triggers de usuario.
select event_object_table as tabla,
       trigger_name,
       event_manipulation as evento,
       action_timing as momento
from information_schema.triggers
where trigger_schema = 'public'
order by event_object_table, trigger_name, event_manipulation;

-- 7. Funciones y si son SECURITY DEFINER.
select p.proname as funcion,
       pg_get_function_identity_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer,
       p.proconfig as configuracion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- 8. Secuencia del código de ticket.
select sequencename, start_value, increment_by
from pg_sequences
where schemaname = 'public';

-- 9. Bucket de adjuntos.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'ticket-attachments';

-- 10. Políticas de Storage para el bucket.
select policyname, cmd, array_to_string(roles, ',') as roles
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

-- 11. Conteo de datos de referencia.
select 'campuses' as tabla, count(*)::int as filas from public.campuses
union all select 'buildings', count(*)::int from public.buildings
union all select 'classrooms', count(*)::int from public.classrooms
union all select 'classroom_directions', count(*)::int from public.classroom_directions
union all select 'ticket_categories', count(*)::int from public.ticket_categories
union all select 'help_articles', count(*)::int from public.help_articles
union all select 'support_channels', count(*)::int from public.support_channels
union all select 'announcements', count(*)::int from public.announcements
order by tabla;

-- 12. Prueba de aislamiento (ejecutada como rol autenticado simulado).
--     Sin JWT, auth.uid() es NULL: los helpers deben devolver NULL/false.
select auth.uid() is null as sin_jwt,
       public.current_user_role() is null as rol_nulo,
       public.is_staff() = false as staff_falso,
       public.is_admin() = false as admin_falso;
