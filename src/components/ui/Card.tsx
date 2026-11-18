import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-7',
} as const;

export function Card({ className, interactive = false, padding = 'md', ...props }: CardProps) {
  return (
    <div
      className={cn(interactive ? 'card-interactive' : 'card', PADDINGS[padding], className)}
      {...props}
    />
  );
}
