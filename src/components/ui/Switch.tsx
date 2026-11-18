import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  id?: string;
}

export function Switch({ checked, onChange, label, description, id }: SwitchProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={id ? `${id}-label` : undefined} className="text-sm font-medium text-ink">
          {label}
        </p>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        id={id}
        aria-checked={checked}
        aria-labelledby={id ? `${id}-label` : undefined}
        aria-label={id ? undefined : label}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition',
          checked ? 'border-brand bg-brand' : 'border-line bg-canvas',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow transition',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  );
}
