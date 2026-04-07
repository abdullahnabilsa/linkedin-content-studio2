'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MessageCounterProps {
  /** Number of messages sent in the current conversation */
  current: number;
  /**
   * Maximum allowed messages.
   * Pass Infinity (or any number > 9999) to indicate "unlimited".
   */
  max: number;
  /** Extra classes */
  className?: string;
}

/**
 * Colour thresholds follow the PDD specification:
 *   Free  (max 15):  normal 1-12 · warning 13 · critical 14 · limit 15
 *   Premium (max 75): normal 1-60 · warning 61-70 · critical 71-74 · limit 75
 *   Admin (unlimited): always normal
 */
type Severity = 'normal' | 'warning' | 'critical' | 'limit';

function computeSeverity(current: number, max: number): Severity {
  if (max > 9999) return 'normal'; /* unlimited / admin */
  if (current >= max) return 'limit';

  const ratio = current / max;
  const remaining = max - current;

  if (remaining <= 1) return 'critical';
  if (ratio >= 0.85) return 'warning';
  return 'normal';
}

const SEVERITY_CLASSES: Record<Severity, string> = {
  normal: 'text-[var(--text-muted)]',
  warning: 'text-amber-400',
  critical: 'text-red-400 font-medium',
  limit: 'text-red-500 font-semibold',
};

export function MessageCounter({
  current,
  max,
  className,
}: MessageCounterProps) {
  const t = useTranslations('common');
  const isUnlimited = max > 9999;
  const severity = useMemo(() => computeSeverity(current, max), [current, max]);

  const label = isUnlimited
    ? `${current}`
    : `${current}/${max}`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] select-none',
        SEVERITY_CLASSES[severity],
        className,
      )}
      title={
        isUnlimited
          ? t('messageCounter.unlimited')
          : t('messageCounter.tooltip', { current, max })
      }
    >
      <MessageSquare className="h-3 w-3" />
      <span>{label}</span>
      {isUnlimited && <span>♾️</span>}
    </span>
  );
}