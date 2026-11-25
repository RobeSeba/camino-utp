-- ============================================================
-- Camino UTP · Usuarios de prueba (desarrollo)
-- Crea/actualiza cuentas de prueba para los roles: student, staff, admin.
-- Idempotente en la medida posible: reutiliza usuarios existentes por email.
--
-- Credenciales (solo pruebas):
--   estudiante@utp.edu.pe / CaminoUtp123!  (student)
--   sae@utp.edu.pe        / CaminoUtp123!  (staff)
--   admin@utp.edu.pe      / CaminoUtp123!  (admin)
--
-- Requiere privilegios para escribir en auth.users/auth.identities/public.profiles.
-- Si tu versión de Supabase/Auth difiere en columnas de auth.*, crea los usuarios
-- desde el Dashboard (Authentication > Users) y ejecuta la sección de perfiles.
-- ============================================================

-- pgcrypto para hash de contraseñas (bcrypt)
create extension if not exists pgcrypto with schema extensions;

do $$
declare
  v_instance_id uuid := '00000000-0000-0000-0000-000000000000';
  v_campus_id uuid;
  v_password text := 'CaminoUtp123!';
  v_now timestamptz := now();

  r record;
  v_users jsonb := jsonb_build_array(
    jsonb_build_object(
      'email', 'estudiante@utp.edu.pe',
      'full_name', 'Estudiante Prueba',
      'role', 'student',
      'student_code', 'U20240001',
      'phone', '+51 900 000 001',
      'career', 'Ingeniería de Sistemas e Informática',
      'cycle', 'Ciclo 9'
    ),
    jsonb_build_object(
      'email', 'sae@utp.edu.pe',
      'full_name', 'Personal SAE Prueba',
      'role', 'staff',
      'student_code', null,
      'phone', '+51 900 000 002',
      'career', 'Servicio de Atención al Estudiante',
      'cycle', null
    ),
    jsonb_build_object(
      'email', 'admin@utp.edu.pe',
      'full_name', 'Admin Prueba',
      'role', 'admin',
      'student_code', null,
      'phone', '+51 900 000 003',
      'career', 'Administración del sistema',
      'cycle', null
    )
  );
  v_email text;
  v_full_name text;
  v_role public.user_role;
  v_student_code text;
  v_phone text;
  v_career text;
  v_cycle text;
  v_user_id uuid;
  v_encrypted text;
begin
  select id into v_campus_id
  from public.campuses
  where code = 'LIMA-CENTRO'
  limit 1;

  -- Hash bcrypt (pgcrypto). Supabase suele exponer crypt en extensions.
  v_encrypted := extensions.crypt(v_password, extensions.gen_salt('bf'));

  for r in select value from jsonb_array_elements(v_users) as value
  loop
    v_email := lower(r.value ->> 'email');
    v_full_name := r.value ->> 'full_name';
    v_role := (r.value ->> 'role')::public.user_role;
    v_student_code := r.value ->> 'student_code';
    v_phone := r.value ->> 'phone';
    v_career := r.value ->> 'career';
    v_cycle := r.value ->> 'cycle';

    select id into v_user_id
    from auth.users
    where lower(email) = v_email
    limit 1;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_sent_at,
        phone,
        phone_change,
        phone_change_token,
        email_change_token_current,
        email_change_confirm_status,
        reauthentication_token,
        is_sso_user,
        is_anonymous
      ) values (
        v_user_id,
        v_instance_id,
        'authenticated',
        'authenticated',
        v_email,
        v_encrypted,
        v_now,
        v_now,
        null,
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', v_full_name),
        false,
        v_now,
        v_now,
        '',
        '',
        '',
        '',
        null,
        null,
        '',
        '',
        '',
        0,
        '',
        false,
        false
      );

      insert into auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        v_user_id,
        v_user_id::text,
        jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
        'email',
        v_now,
        v_now,
        v_now
      );
    else
      -- Asegura acceso con la contraseña de prueba y correo confirmado.
      update auth.users
         set encrypted_password = v_encrypted,
             email_confirmed_at = coalesce(email_confirmed_at, v_now),
             updated_at = v_now,
             raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', v_full_name),
             raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'))
       where id = v_user_id;
    end if;

    -- El trigger on_auth_user_created crea el perfil como student; aquí fijamos datos/rol.
    -- guard_profile_update permite cambios cuando auth.uid() es NULL (contexto de migración/service).
    update public.profiles
       set full_name = v_full_name,
           email = v_email,
           role = v_role,
           student_code = v_student_code,
           phone = v_phone,
           career = v_career,
           cycle = v_cycle,
           campus_id = coalesce(v_campus_id, campus_id),
           is_active = true,
           updated_at = v_now
     where id = v_user_id;

    -- Respaldo por si el trigger no ejecutó en algún entorno.
    if not found then
      insert into public.profiles (
        id, full_name, email, student_code, phone, career, campus_id, cycle, role, is_active, created_at, updated_at
      ) values (
        v_user_id, v_full_name, v_email, v_student_code, v_phone, v_career, v_campus_id, v_cycle, v_role, true, v_now, v_now
      )
      on conflict (id) do update
        set full_name = excluded.full_name,
            email = excluded.email,
            role = excluded.role,
            student_code = excluded.student_code,
            phone = excluded.phone,
            career = excluded.career,
            campus_id = coalesce(excluded.campus_id, public.profiles.campus_id),
            cycle = excluded.cycle,
            is_active = true,
            updated_at = v_now;
    end if;
  end loop;
end;
$$;

-- Verificación (solo lectura):
-- select id, full_name, email, role, student_code, is_active
-- from public.profiles
-- where email in ('estudiante@utp.edu.pe','sae@utp.edu.pe','admin@utp.edu.pe')
-- order by role;
