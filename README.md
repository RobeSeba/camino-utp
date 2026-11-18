# Camino UTP

Aplicación web para estudiantes de la UTP: ubicación de aulas dentro del campus, centro de ayuda,
reporte de incidencias con seguimiento y preferencias de accesibilidad.

> **Estado actual: Etapa 2 — Frontend.**
> La interfaz está construida y navegable, con datos simulados. **No hay backend, autenticación
> real ni conexión a base de datos todavía.** Eso corresponde a la Etapa 3 (Supabase).

---

## Stack

| Capa | Tecnología |
|---|---|
| UI | React 18 + TypeScript |
| Bundler | Vite 5 |
| Estilos | Tailwind CSS 3 (tokens CSS, tema claro/oscuro/alto contraste) |
| Rutas | React Router 6 |
| Iconos | Lucide React |
| Estado | Context API (sesión, tickets, accesibilidad, notificaciones) |
| Backend previsto | Supabase (Auth + PostgreSQL + RLS + Storage) |

---

## Requisitos

- Node.js 18 o superior (probado con Node 22).
- npm 9 o superior.
- Visual Studio Code (recomendado) con la extensión *Tailwind CSS IntelliSense*.

> **Windows / PowerShell:** si `npm` falla con *"la ejecución de scripts está deshabilitada"*,
> usa `npm.cmd` en lugar de `npm`, o ejecuta una vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

---

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el servidor de desarrollo
npm run dev
# → http://localhost:5173
```

### Scripts disponibles

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Verifica tipos y genera la build de producción en `dist/` |
| `npm run preview` | Sirve localmente la build de producción |
| `npm run typecheck` | Solo verificación de TypeScript |

### Acceso de demostración

La autenticación usa **Supabase Auth** (sesión persistida por el cliente de Supabase). En `/login`
puedes iniciar sesión con las cuentas de prueba o usar los botones *Entrar como estudiante / SAE*:

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante | `estudiante@utp.edu.pe` | `CaminoUtp123!` |
| Personal SAE | `sae@utp.edu.pe` | `CaminoUtp123!` |
| Administrador | `admin@utp.edu.pe` | `CaminoUtp123!` |

Estas cuentas se crean con la migración `supabase/migrations/20261118130000_test_users.sql`.
Consulta [`docs/usuarios-prueba.md`](docs/usuarios-prueba.md) para aplicarla y verificarla.

---

## Rutas

### Públicas

| Ruta | Pantalla |
|---|---|
| `/login` | Ingreso con correo y contraseña |
| `/login/biometrico` | Ingreso con huella + estado de error recuperable |
| `/recuperar` | Recuperación de contraseña |

### Privadas (dentro de `AppLayout`)

| Ruta | Pantalla |
|---|---|
| `/app/inicio` | Inicio: próxima clase, accesos rápidos, avisos |
| `/app/aulas` | Buscador de aulas con filtros |
| `/app/aulas/:id` | Detalle, mapa esquemático y ruta paso a paso |
| `/app/perfil` | Perfil del estudiante |
| `/app/perfil/editar` | Edición de datos con validación |
| `/app/ayuda` | Centro de ayuda |
| `/app/ayuda/faq` | Preguntas frecuentes (buscador + acordeón) |
| `/app/ayuda/canales` | Canales de atención del SAE |
| `/app/tickets` | Listado de tickets con filtros |
| `/app/tickets/nuevo` | Formulario de incidencia (`?aula=A-201` precarga el aula) |
| `/app/tickets/:code` | Detalle, historial y conversación del ticket |
| `/app/accesibilidad` | Tamaño de texto, tema, contraste y movimiento |
| `/app/staff` | Bandeja SAE (restringida por rol) |

---

## Estructura del proyecto

```
camino-utp/
├─ public/favicon.svg
├─ src/
│  ├─ components/
│  │  ├─ layout/          # AppLayout, Logo
│  │  ├─ ui/              # Button, Input, Select, Textarea, Card, Badge, Modal, Switch...
│  │  ├─ CampusMap.tsx
│  │  └─ ErrorBoundary.tsx
│  ├─ context/            # Auth, Accessibility, Tickets, Toast
│  ├─ data/mock.ts        # Datos temporales (aulas, FAQ, canales, tickets)
│  ├─ lib/                # constants (rutas, estados), utils
│  ├─ pages/
│  │  ├─ auth/            # Login, biométrico, recuperación
│  │  ├─ app/             # Inicio, aulas, perfil, ayuda, tickets, accesibilidad
│  │  └─ staff/           # Bandeja SAE
│  ├─ types/              # Entidades TypeScript
│  ├─ App.tsx             # Definición de rutas
│  ├─ main.tsx            # Providers + montaje
│  └─ index.css           # Tokens de diseño y estilos base
├─ .env.example
├─ tailwind.config.js
└─ vite.config.ts
```

### Separación de responsabilidades

- **Páginas** componen pantallas; no contienen acceso a datos de red.
- **Context** mantiene el estado de la sesión simulada, tickets y preferencias.
- **`data/mock.ts`** es la única fuente de datos temporales. En la Etapa 3 se reemplaza por
  `services/*.service.ts` que llamarán a Supabase.
- **`types/`** define las entidades que luego mapearán las tablas de PostgreSQL.

---

## Datos y persistencia local (temporal)

| Clave | Almacenamiento | Contenido |
|---|---|---|
| `camino-utp:session` | `sessionStorage` | Usuario simulado |
| `camino-utp:tickets` | `localStorage` | Tickets creados y sus mensajes |
| `camino-utp:a11y` | `localStorage` | Preferencias de accesibilidad |

Para reiniciar la demostración, borra esas claves desde DevTools → *Application → Storage*.
Los tickets iniciales se vuelven a cargar desde `src/data/mock.ts`.

---

## Accesibilidad

- Tokens de color con contraste verificado y foco visible en todos los controles.
- Preferencias del usuario: escala de texto (90 %–125 %), tema claro/oscuro/sistema, alto
  contraste y reducción de movimiento.
- Se aplican a toda la app mediante atributos en `<html>` y variables CSS; se guardan en el
  dispositivo.
- Formularios con `label`, `aria-invalid`, mensajes de error asociados y estados de carga.
- Navegación por teclado, enlace "Saltar al contenido" y regiones `aria-live` para avisos.

---

## Sobre el diseño

El archivo de Figma indicado en el encargo **no es accesible públicamente** desde este entorno
(requiere autenticación), por lo que esta primera versión usa una identidad provisional coherente
con la marca UTP (rojo institucional, tipografía Inter, tarjetas y radios suaves), basada en las
pantallas y estados descritos en la documentación del proyecto (AP2/AP3).

Cuando estén disponibles los frames exportados, los ajustes se concentran en:

- `src/index.css` (paleta, tipografía, radios).
- `tailwind.config.js` (tokens y sombras).
- `src/components/ui/*` (estilos de componentes).

---

## Qué falta antes de la Etapa 3

1. **Autenticación real** con Supabase Auth (reemplazar `AuthContext`).
2. **Base de datos PostgreSQL** y migraciones versionadas (`supabase/migrations`).
3. **Políticas RLS** por rol (estudiante, SAE, administrador) y validación en servidor.
4. **Persistencia real** de perfil, tickets, mensajes y adjuntos (Storage).
5. **Sustituir `src/data/mock.ts`** por servicios tipados.
6. **Rutas protegidas** con sesión y rol verificados contra el backend.
7. **Panel SAE** con asignación, notas internas y auditoría de estados.
8. **Pruebas** de RLS, formularios y flujos completos.
9. **Git**: `git init`, primer commit y publicación en GitHub (`camino-utp`).
10. **Despliegue** estático con fallback SPA (Vercel / Netlify / Cloudflare Pages).

---

## Aviso

Este repositorio es un proyecto académico en construcción. No debe usarse con datos reales de
estudiantes hasta completar autenticación, autorización por roles y políticas de acceso a datos.
