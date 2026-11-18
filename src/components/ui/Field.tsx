import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FieldProps {
  id: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({
  id,
  label,
  hint,
  error,
  required = false,
  optional = false,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="flex items-center gap-1 text-sm font-medium text-ink">
          {label}
          {required && (
            <span className="text-danger" aria-hidden="true">
              *
            </span>
          )}
          {optional && <span className="text-xs font-normal text-muted">(opcional)</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="flex items-start gap-1 text-xs font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
