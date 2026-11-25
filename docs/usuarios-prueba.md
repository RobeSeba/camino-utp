# Usuarios de prueba · Camino UTP

Credenciales de prueba generadas para validar los flujos por rol contra Supabase.

> **Solo para entorno de desarrollo/pruebas.** No uses estas contraseñas en producción y cámbialas si las cuentas se reutilizan.

## Credenciales

| Rol | Nombre | Correo | Contraseña | Código estudiante | Perfil esperado |
|---|---|---|---|---|---|
| Estudiante (`student`) | Estudiante Prueba | `estudiante@utp.edu.pe` | `CaminoUtp123!` | `U20240001` (ciclo `Ciclo 9`) | Puede ver su perfil, tickets propios, crear tickets/mensajes y gestionar su accesibilidad. |
| Personal SAE (`staff`) | Personal SAE Prueba | `sae@utp.edu.pe` | `CaminoUtp123!` | — | Puede acceder a la bandeja SAE, ver tickets/perfiles, cambiar estado/prioridad/asignación y responder. |
| Administrador (`admin`) | Admin Prueba | `admin@utp.edu.pe` | `CaminoUtp123!` | — | Permisos administrativos según RLS/privilegios (gestión de catálogo, perfiles/roles, etc.). |

## Aplicar en la base de datos

Se incluye la migración `supabase/migrations/20261118130000_test_users.sql`, que:

1. Asegura la extensión `pgcrypto` (para `crypt`/`gen_salt`).
2. Crea (o actualiza de forma idempotente) los usuarios en `auth.users` y `auth.identities` con correo confirmado.
3. Actualiza `public.profiles` con nombre, rol, sede Lima Centro y datos de prueba (el perfil base se crea por el trigger `on_auth_user_created`).

### Opción A · Supabase CLI (recomendado)

```bash
npx supabase login
npx supabase link --project-ref zsenvmnasrelqsclcrmd
npx supabase db push
npx supabase migration list
```

En Windows PowerShell, si `npx.ps1` está bloqueado, usa el ejecutable de Node/npm directamente, por ejemplo:

```powershell
& "C:\Program Files\nodejs\npx.cmd" supabase db push
```

### Opción B · SQL Editor de Supabase

1. Abre el proyecto `camino-utp` en https://supabase.com/dashboard.
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/migrations/20261118130000_test_users.sql`.
3. Verifica que no haya errores.

## Verificación rápida

- Revisa perfiles y roles:
  ```sql
  select p.id, p.full_name, p.email, p.role, p.student_code, p.is_active
  from public.profiles p
  where p.email in ('estudiante@utp.edu.pe', 'sae@utp.edu.pe', 'admin@utp.edu.pe')
  order by p.role;
  ```
- Inicia sesión en la app (`npm run dev`) con cada cuenta y comprueba:
  - **Estudiante:** acceso a inicio/aulas/ayuda/tickets propios, creación de ticket y mensajes.
  - **SAE:** acceso a la vista/bandeja de staff, listado global y cambio de estado/respuestas según RLS.
  - **Administrador:** capacidades administrativas definidas por políticas y privilegios.

## Notas

- `src/lib/constants.ts` (`DEMO_ACCOUNTS`) fue actualizado para usar estas credenciales en los accesos demo.
- La creación directa en `auth.users`/`auth.identities` depende de privilegios de base de datos y de la versión de GoTrue/Auth del proyecto. Si la migración falla por diferencias de columnas en `auth`, crea los usuarios desde **Authentication > Users** en el dashboard y luego ejecuta solo el bloque de actualización de `public.profiles` del script (ajustando los correos si es necesario).
- Confirma que el inicio de sesión por correo/contraseña esté habilitado y que la configuración de confirmación de correo del proyecto permita el acceso (los usuarios de prueba se marcan como confirmados en el script).
- No se incluyen claves privadas ni `service_role` en el frontend/repositorio.
