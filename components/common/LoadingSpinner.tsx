'use client';

import { cn } from '@/utils/cn';

/** Pixel size classes per tier */
const SIZE_MAP = {
  sm: 'h-4 w-4 border-[2px]',
  md: 'h-6 w-6 border-[2px]',
  lg: 'h-10 w-10 border-[3px]',
  xl: 'h-16 w-16 border-[3px]',
} as const;

interface LoadingSpinnerProps {
  /**
   * sm  – inside buttons / compact areas (16 px)
   * md  – inline tables, lists (24 px)
   * lg  – section loading (40 px)
   * xl  – large placeholder (64 px)
   * page – full-viewport centred xl spinner with optional text
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'page';
  /** Optional text rendered below the spinner (md+ sizes) */
  text?: string;
  /** Extra classes forwarded to the outermost element */
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  text,
  className,
}: LoadingSpinnerProps) {
  /* Full-page variant wraps xl spinner in a centring container */
  if (size === 'page') {
    return (
      <div
        className={cn(
          'flex h-full min-h-[50vh] w-full flex-col items-center justify-center gap-4',
          className,
        )}
      >
        <div
          className={cn(
            'animate-spin rounded-full border-emerald-500/30 border-t-emerald-400',
            SIZE_MAP.xl,
          )}
          role="status"
          aria-label="Loading"
        />
        {text && (
          <p className="text-sm text-[var(--text-muted)] animate-pulse">{text}</p>
        )}
      </div>
    );
  }

  /* Inline / embedded variant */
  return (
    <span
      className={cn('inline-flex flex-col items-center gap-2', className)}
    >
      <span
        className={cn(
          'animate-spin rounded-full border-emerald-500/30 border-t-emerald-400',
          SIZE_MAP[size],
        )}
        role="status"
        aria-label="Loading"
      />
      {text && size !== 'sm' && (
        <span className="text-xs text-[var(--text-muted)]">{text}</span>
      )}
    </span>
  );
}