import { cn, initials } from '@/lib/utils';

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: Size;
  className?: string;
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
};

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={`Foto de ${name}`}
        className={cn('shrink-0 rounded-full object-cover', SIZES[size], className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-brand-soft font-bold uppercase text-brand-ink',
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
