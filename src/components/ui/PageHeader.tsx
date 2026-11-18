import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  backTo?: { to: string; label: string };
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, backTo, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {backTo && (
          <Link
            to={backTo.to}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted transition hover:text-brand"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            {backTo.label}
          </Link>
        )}
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
