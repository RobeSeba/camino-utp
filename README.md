# Camino UTP

Aplicación web para estudiantes de la UTP: ubicación de aulas dentro del campus, centro de ayuda,
reporte de incidencias con seguimiento y preferencias de accesibilidad.

> **Estado actual: Etapa 3 — Integración con Supabase.**
> La aplicación utiliza Supabase Auth y servicios conectados a PostgreSQL, RLS y Storage para perfiles,
> aulas, contenido de ayuda y tickets. Es necesario configurar las variables de entorno y aplicar
> las migraciones antes de ejecutar la aplicación contra un proyecto Supabase.

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
| Backend | Supabase (Auth + PostgreSQL + RLS + Storage) |

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
# 1. Crear el archivo de entorno a partir del ejemplo
cp .env.example .env
# Completa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env

# 2. Instalar dependencias
npm install

# 3. Levantar el servidor de desarrollo
npm run dev
# → http://localhost:5173
```

En Windows PowerShell, crea el archivo con `Copy-Item .env.example .env`.

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
| `/app/tickets` | Listado de tickets con filtros y opción para retirarlos de la lista |
| `/app/tickets/nuevo` | Formulario de incidencia (`?aula=A-201` precarga el aula) |
| `/app/tickets/:code` | Detalle, historial y conversación del ticket |
| `/app/accesibilidad` | Tamaño de texto, tema, contraste y movimiento |
| `/app/staff` | Bandeja SAE (restringida por rol) |

### Mapa interactivo por sede

El mapa esquemático de "Cómo llegar" abre un visor con dos vistas (ventana centrada en PC y casi
pantalla completa en móvil):

- **Vista 3D** (Three.js): gira y acerca **una sede a la vez**. El selector "Sede" cambia entre
  Hernán Velarde, Torre Arequipa, Torre Petit Thouars y Torre Pacífico; cada sede tiene sus propios
  pabellones y alturas.
- **Mapa real** (Leaflet + OpenStreetMap, sin clave): muestra las cuatro sedes con coordenadas
  reales. Las dos torres de Av. Arequipa/Petit Thouars aparecen separadas. La ruta peatonal se
  calcula con OSRM; si falla, se usa la estimación local.

La jerarquía es **Lima Centro → sede → pabellón → piso → aula**. Al tocar un pabellón se abre su
plano esquemático por piso; el piso se deduce del primer número del código (`A-201` → 2,
`AR-A-305` → 3). Las rutas paso a paso indican primero la sede y luego el pabellón/piso.
Three.js y Leaflet se cargan de forma diferida.

---

## Estructura del proyecto

```
camino-utp/
├─ public/favicon.svg
├─ src/
│  ├─ components/
│  │  ├─ layout/          # AppLayout, Logo
│  │  ├─ ui/              # Button, Input, Select, Textarea, Card, Badge, Modal, Switch...
│  │  ├─ CampusMap.tsx          # Mapa 2D y acceso al visor 3D
│  │  ├─ CampusMap3D.tsx        # Escena Three.js (edificios, ruta y selección)
│  │  ├─ InteractiveMapModal.tsx# Modal responsive: 3D / OSM, origen/destino y tiempo
│  │  ├─ RealMapView.tsx        # Mapa real con Leaflet + OpenStreetMap
│  │  ├─ FloorPlanPanel.tsx     # Plano esquematico por piso del pabellon
│  │  └─ ErrorBoundary.tsx
│  ├─ context/            # Auth, Accessibility, Tickets, Toast
│  ├─ services/           # Consultas y operaciones de Supabase
│  ├─ lib/                # Cliente Supabase, constantes y utilidades
│  ├─ pages/
│  │  ├─ auth/            # Login, biométrico, recuperación
│  │  ├─ app/             # Inicio, aulas, perfil, ayuda, tickets, accesibilidad
│  │  └─ staff/           # Bandeja SAE
│  ├─ types/              # Entidades TypeScript
│  ├─ App.tsx             # Definición de rutas
│  ├─ main.tsx            # Providers + montaje
│  └─ index.css           # Tokens de diseño y estilos base
├─ supabase/migrations/  # Esquema, políticas RLS y datos iniciales
├─ .env.example
├─ tailwind.config.js
└─ vite.config.ts
```

### Separación de responsabilidades

- **Páginas** componen pantallas y delegan las operaciones de datos en contextos y servicios.
- **Context** mantiene el estado de autenticación, tickets, accesibilidad y notificaciones.
- **`services/`** centraliza las consultas a Supabase Auth, PostgreSQL y Storage.
- **`supabase/migrations/`** contiene el esquema, las políticas RLS, funciones y datos iniciales.
- **`types/`** define las entidades TypeScript que representan los datos de la aplicación.

---

## Datos y persistencia

| Información | Almacenamiento | Contenido |
|---|---|---|
| Sesión | Supabase Auth | Sesión persistida por el cliente de Supabase (`camino-utp:auth`). |
| Perfiles, aulas y contenido | PostgreSQL | Datos consultados mediante `src/services/`. |
| Tickets, mensajes e historial | PostgreSQL | Persistencia real protegida por RLS. |
| Adjuntos de tickets | Supabase Storage | Bucket privado `ticket-attachments`. |
| Preferencias de accesibilidad | `localStorage` y Supabase | Copia local para respuesta inmediata y sincronización de preferencias del usuario. |

Los tickets no se guardan en `localStorage`; se consultan y actualizan en Supabase.

### Retiro de tickets

El estudiante puede retirar un ticket desde el listado o desde su detalle. La operación es lógica:
el ticket deja de aparecer en su lista, pero la fila, los mensajes, los adjuntos y la bitácora se
conservan en Supabase para que el SAE mantenga el seguimiento y la auditoría. La autorización se
valida en servidor mediante la función `hide_own_ticket()`.

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

## Pendientes antes de producción

1. Ejecutar y verificar todas las migraciones en el proyecto Supabase de destino.
2. Probar las políticas RLS con cuentas de estudiante, SAE y administrador.
3. Probar los flujos completos de tickets, incluidos mensajes, adjuntos, cambios de estado y retiro lógico.
4. Configurar el despliegue con las variables de entorno y el fallback SPA.
5. Activar e implementar WebAuthn/passkeys si se requiere autenticación biométrica real; la pantalla biométrica actual es demostrativa.
6. Sustituir el mapa esquemático por coordenadas y rutas reales del campus cuando estén disponibles.

---

## Aviso

Este repositorio es un proyecto académico en construcción. No debe usarse con datos reales de
estudiantes hasta completar autenticación, autorización por roles y políticas de acceso a datos.
