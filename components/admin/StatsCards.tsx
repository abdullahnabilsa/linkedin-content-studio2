'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface StatCard {
  key: string;
  label: string;
  value: number;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  color: string;
  bgColor: string;
}

interface StatsCardsProps {
  cards: StatCard[];
}

function useAnimatedCount(target: number, duration: number = 800): number {
  const [count, setCount] = useState(0);
  const startTimestamp = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    startTimestamp.current = null;

    const step = (timestamp: number) => {
      if (!startTimestamp.current) {
        startTimestamp.current = timestamp;
      }

      const progress = Math.min((timestamp - startTimestamp.current) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * target));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    rafId.current = requestAnimationFrame(step);

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [target, duration]);

  return count;
}

function StatCardItem({ card }: { card: StatCard }) {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const animatedValue = useAnimatedCount(card.value);
  const Icon = card.icon;

  const formattedValue = animatedValue.toLocaleString(
    locale === 'ar' ? 'ar-SA' : 'en-US'
  );

  const renderTrend = () => {
    if (card.trend === undefined && !card.trendLabel) return null;

    const trend = card.trend ?? 0;
    const isPositive = trend > 0;
    const isNegative = trend < 0;
    const isNeutral = trend === 0;

    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const trendColor = isPositive
      ? 'text-emerald-500'
      : isNegative
        ? 'text-red-500'
        : 'text-[var(--text-muted)]';

    const displayLabel = card.trendLabel
      ? `${Math.abs(trend)}% ${card.trendLabel}`
      : `${isPositive ? '+' : ''}${trend}%`;

    return (
      <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
        <TrendIcon className="h-3 w-3" />
        <span>{displayLabel}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--text-secondary)]">
          {card.label}
        </span>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', card.bgColor)}>
          <Icon className={cn('h-5 w-5', card.color)} />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold text-[var(--text-primary)]">
          {formattedValue}
        </p>
        <div className="mt-1">{renderTrend()}</div>
      </div>
    </div>
  );
}

export function StatsCards({ cards }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <StatCardItem key={card.key} card={card} />
      ))}
    </div>
  );
}