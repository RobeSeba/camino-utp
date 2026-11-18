import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Accessibility,
  House,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  MessageSquarePlus,
  Ticket,
  UserRound,
  X,
} from 'lucide-react';
import { Logo } from './Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { ROUTES, ROLE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';

const MAIN_NAV = [
  { to: ROUTES.home, label: 'Inicio', icon: House },
  { to: ROUTES.classrooms, label: 'Buscar aula', icon: MapPin },
  { to: ROUTES.help, label: 'Centro de ayuda', icon: LifeBuoy },
  { to: ROUTES.tickets, label: 'Mis tickets', icon: Ticket },
  { to: ROUTES.profile, label: 'Mi perfil', icon: UserRound },
] as const;

const MOBILE_NAV = [
  { to: ROUTES.home, label: 'Inicio', icon: House },
  { to: ROUTES.classrooms, label: 'Aulas', icon: MapPin },
  { to: ROUTES.help, label: 'Ayuda', icon: LifeBuoy },
  { to: ROUTES.tickets, label: 'Tickets', icon: Ticket },
  { to: ROUTES.profile, label: 'Perfil', icon: UserRound },
] as const;

export function AppLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas text-muted" role="status" aria-live="polite">
        <Spinner className="h-6 w-6" />
        <span className="ml-3 text-sm font-medium">Cargando tu sesión…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-float"
      >
        Saltar al contenido
      </a>

      {/* ---------- Sidebar de escritorio ---------- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <Logo className="px-2" />

        <nav className="mt-8 flex-1 space-y-1" aria-label="Navegación principal">
          {MAIN_NAV.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
          <div className="!mt-6 border-t border-line pt-4">
            <SidebarLink to={ROUTES.accessibility} label="Accesibilidad" icon={Accessibility} />
            {user?.role !== 'student' && (
              <SidebarLink to={ROUTES.staff} label="Bandeja SAE" icon={Ticket} />
            )}
          </div>
        </nav>

        <div className="mb-4 rounded-2xl border border-line bg-canvas p-4">
          <p className="text-sm font-semibold text-ink">¿Necesitas ayuda?</p>
          <p className="mt-1 text-xs text-muted">Reporta una incidencia y recibe un código de seguimiento.</p>
          <Button
            size="sm"
            className="mt-3 w-full"
            icon={MessageSquarePlus}
            onClick={() => navigate(ROUTES.newTicket)}
          >
            Crear ticket
          </Button>
        </div>

        {user && (
          <div className="flex items-center gap-3 rounded-xl border border-line p-2.5">
            <Avatar name={user.fullName} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
              <p className="truncate text-xs text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-1.5 text-muted transition hover:bg-canvas hover:text-danger"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </aside>

      {/* ---------- Barra superior movil ---------- */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-ink transition hover:bg-canvas"
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Logo />
        </div>
        <NavLink
          to={ROUTES.profile}
          className="rounded-full"
          aria-label="Ir a mi perfil"
        >
          <Avatar name={user?.fullName ?? 'Estudiante UTP'} size="sm" />
        </NavLink>
      </header>

      {/* ---------- Drawer movil ---------- */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative h-full w-[82%] max-w-xs overflow-y-auto border-r border-line bg-surface p-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {user && (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-canvas p-3">
                <Avatar name={user.fullName} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
                  <p className="truncate text-xs text-muted">{user.studentCode}</p>
                </div>
              </div>
            )}

            <nav className="mt-6 space-y-1" aria-label="Navegación principal">
              {MAIN_NAV.map((item) => (
                <SidebarLink key={item.to} {...item} />
              ))}
              <div className="!mt-4 border-t border-line pt-4">
                <SidebarLink to={ROUTES.accessibility} label="Accesibilidad" icon={Accessibility} />
                {user?.role !== 'student' && (
                  <SidebarLink to={ROUTES.staff} label="Bandeja SAE" icon={Ticket} />
                )}
              </div>
            </nav>

            <Button variant="secondary" fullWidth icon={LogOut} className="mt-6" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      )}

      {/* ---------- Contenido ---------- */}
      <main id="contenido" className="px-4 pb-28 pt-6 sm:px-6 lg:ml-64 lg:px-8 lg:pb-12 lg:pt-10">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* ---------- Navegacion inferior movil ---------- */}
      <nav
        aria-label="Navegación rápida"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex items-stretch justify-between">
          {MOBILE_NAV.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition',
                    isActive ? 'text-brand' : 'text-muted hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.4]')} aria-hidden="true" />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-canvas hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('h-5 w-5', isActive ? 'text-brand' : 'text-muted')} aria-hidden="true" />
          {label}
        </>
      )}
    </NavLink>
  );
}
