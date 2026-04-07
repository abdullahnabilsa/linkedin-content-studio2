'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

const VARIANT_STYLES = {
  error: {
    border: 'border-s-red-500',
    bg: 'bg-red-500/5',
    icon: 'text-red-400',
    text: 'text-red-300',
  },
  warning: {
    border: 'border-s-amber-500',
    bg: 'bg-amber-500/5',
    icon: 'text-amber-400',
    text: 'text-amber-300',
  },
  info: {
    border: 'border-s-sky-500',
    bg: 'bg-sky-500/5',
    icon: 'text-sky-400',
    text: 'text-sky-300',
  },
} as const;

const ICONS = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
} as const;

interface ErrorMessageProps {
  /** Human-readable error / info text */
  message: string;
  /** Visual variant — drives colour & icon */
  type?: 'error' | 'warning' | 'info';
  /** If provided a "Retry" button is rendered */
  onRetry?: () => void;
  /** Extra classes */
  className?: string;
}

export function ErrorMessage({
  message,
  type = 'error',
  onRetry,
  className,
}: ErrorMessageProps) {
  const t = useTranslations('common');
  const style = VARIANT_STYLES[type];
  const Icon = ICONS[type];

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] border-s-4 px-4 py-3',
        style.border,
        style.bg,
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.icon)} />

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-relaxed', style.text)}>{message}</p>
      </div>

      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="shrink-0 gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('retry')}
        </Button>
      )}
    </div>
  );
}