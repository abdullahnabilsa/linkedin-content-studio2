'use client';

import { useTranslations } from 'next-intl';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/formatters';

interface TokenCounterProps {
  /** Total tokens consumed in the current conversation */
  tokens: number;
  /**
   * When the provider does not report exact token counts the
   * value is an estimate. Setting this to true prefixes the
   * number with ≈.
   */
  estimated?: boolean;
  /** Extra classes */
  className?: string;
}

export function TokenCounter({
  tokens,
  estimated = false,
  className,
}: TokenCounterProps) {
  const t = useTranslations('common');

  if (tokens <= 0) return null;

  const display = estimated
    ? `≈ ${formatNumber(tokens)}`
    : formatNumber(tokens);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)] select-none',
        className,
      )}
      title={t('tokenCounter.tooltip', { count: tokens })}
    >
      <BarChart3 className="h-3 w-3" />
      <span>{display}</span>
    </span>
  );
}