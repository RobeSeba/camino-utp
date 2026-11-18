import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Field } from './Field';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { id, label, hint, error, optional, className, containerClassName, rows = 4, ...props },
  ref,
) {
  const inputId = id ?? props.name ?? 'textarea';
  return (
    <Field
      id={inputId}
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      optional={optional}
      className={containerClassName}
    >
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          'w-full resize-y rounded-xl border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted transition',
          'focus:border-brand focus:outline-none focus:ring-2 focus:ring-focus',
          error ? 'border-danger' : 'border-line',
          className,
        )}
        {...props}
      />
    </Field>
  );
});
