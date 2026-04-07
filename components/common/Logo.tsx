'use client';

import { Gem } from 'lucide-react';
import { cn } from '@/utils/cn';

/** Pixel dimensions for each size tier */
const ICON_SIZES = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
} as const;

const TEXT_SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
} as const;

interface LogoProps {
  /** The visual size of the logo. Defaults to md. */
  size?: 'sm' | 'md' | 'lg';
  /**
   * full  – icon followed by the application name text.
   * icon  – icon only (collapsed sidebar, favicon placeholder).
   * Defaults to full.
   */
  variant?: 'full' | 'icon';
  /** Additional classes forwarded to the root element */
  className?: string;
}

export function Logo({ size = 'md', variant = 'full', className }: LogoProps) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'ContentPro';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 select-none',
        className,
      )}
    >
      {/* Gem / diamond icon with emerald accent */}
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center rounded-lg',
          'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10',
          'border border-emerald-500/30',
          size === 'sm' && 'h-7 w-7',
          size === 'md' && 'h-9 w-9',
          size === 'lg' && 'h-13 w-13',
        )}
      >
        <Gem
          className={cn(
            'text-emerald-400',
            ICON_SIZES[size],
            /* slightly smaller than container */
            size === 'sm' && 'h-4 w-4',
            size === 'md' && 'h-5 w-5',
            size === 'lg' && 'h-7 w-7',
          )}
        />
        {/* Small emerald dot accent in the top-right corner */}
        <span
          className={cn(
            'absolute rounded-full bg-emerald-400',
            size === 'sm' && '-end-0.5 -top-0.5 h-1.5 w-1.5',
            size === 'md' && '-end-0.5 -top-0.5 h-2 w-2',
            size === 'lg' && '-end-1 -top-1 h-2.5 w-2.5',
          )}
        />
      </span>

      {/* Text portion – hidden when variant is icon */}
      {variant === 'full' && (
        <span
          className={cn(
            'font-bold tracking-tight text-[var(--text-primary)]',
            TEXT_SIZES[size],
          )}
        >
          {appName}
        </span>
      )}
    </span>
  );
}