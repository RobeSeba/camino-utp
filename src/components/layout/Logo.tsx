import { Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

interface LogoProps {
  className?: string;
  tone?: 'default' | 'inverse';
  to?: string;
}

export function Logo({ className, tone = 'default', to = ROUTES.home }: LogoProps) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5', className)} aria-label="Camino UTP, ir al inicio">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
        <Navigation className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            'block text-base font-extrabold tracking-tight',
            tone === 'inverse' ? 'text-white' : 'text-ink',
          )}
        >
          Camino UTP
        </span>
        <span
          className={cn(
            'block text-[10px] font-semibold uppercase tracking-[0.16em]',
            tone === 'inverse' ? 'text-white/70' : 'text-muted',
          )}
        >
          Campus y soporte
        </span>
      </span>
    </Link>
  );
}
