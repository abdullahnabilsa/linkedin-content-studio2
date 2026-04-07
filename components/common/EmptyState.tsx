'use client';

import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface EmptyStateAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
  /** Optional icon rendered before the label */
  icon?: ReactNode;
}

interface EmptyStateProps {
  /** Large illustrative icon (pass a Lucide component, 48-64 px) */
  icon: ReactNode;
  /** Primary headline */
  title: string;
  /** Supporting copy (optional) */
  description?: string;
  /** Optional call-to-action button */
  action?: EmptyStateAction;
  /** Extra classes for the wrapper */
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      {/* Icon container */}
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-[var(--text-primary)]">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="mt-1.5 max-w-[300px] text-sm leading-relaxed text-[var(--text-secondary)]">
          {description}
        </p>
      )}

      {/* CTA */}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-5 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}