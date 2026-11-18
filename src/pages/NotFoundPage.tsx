import { Link } from 'react-router-dom';
import { Compass, House, LifeBuoy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/lib/constants';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-12 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand">Error 404</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Te saliste del camino</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        La página que buscas no existe, cambió de dirección o el enlace está incompleto.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to={ROUTES.home}>
          <Button icon={House}>Ir al inicio</Button>
        </Link>
        <Link to={ROUTES.help}>
          <Button variant="secondary" icon={LifeBuoy}>
            Centro de ayuda
          </Button>
        </Link>
      </div>
    </div>
  );
}
