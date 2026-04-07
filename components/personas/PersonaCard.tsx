'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Star, ArrowRight, ArrowLeft, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import type { Persona } from '@/types/persona';

interface PersonaCardProps {
  /** The persona data to render */
  persona: Persona;
  /** Callback invoked when the user clicks to activate this persona */
  onActivate?: (persona: Persona) => void;
  /** Whether this card is currently the active persona */
  isActive?: boolean;
  /** If true, the premium persona lock overlay is shown for free users */
  isLocked?: boolean;
  /** The display name of the category this persona belongs to */
  categoryName?: string;
  /** Current locale for directional icons */
  locale?: string;
}

export function PersonaCard({
  persona,
  onActivate,
  isActive = false,
  isLocked = false,
  categoryName,
  locale = 'ar',
}: PersonaCardProps) {
  const t = useTranslations('personas');
  const isRTL = locale === 'ar';

  const handleClick = useCallback(() => {
    if (onActivate) {
      onActivate(persona);
    }
  }, [onActivate, persona]);

  /** Determine which type badge to display */
  const renderTypeBadge = () => {
    switch (persona.type) {
      case 'basic':
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs"
          >
            {t('typeBadge.basic')}
          </Badge>
        );
      case 'premium':
        return (
          <Badge className="bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border border-amber-500/30 text-amber-300 text-xs gap-1">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {t('typeBadge.premium')}
          </Badge>
        );
      case 'custom':
        return (
          <Badge
            variant="outline"
            className="border-gray-500/30 bg-gray-500/10 text-gray-400 text-xs"
          >
            {t('typeBadge.custom')}
          </Badge>
        );
      default:
        return null;
    }
  };

  /** Resolve the icon to display — emoji string, URL, or default */
  const renderIcon = () => {
    if (persona.icon_url) {
      /* If it looks like a URL, render an image */
      if (persona.icon_url.startsWith('http')) {
        return (
          <img
            src={persona.icon_url}
            alt={persona.name}
            className="h-8 w-8 rounded-full object-cover"
          />
        );
      }
      /* Otherwise treat it as an emoji */
      return <span className="text-2xl leading-none">{persona.icon_url}</span>;
    }
    return <User className="h-5 w-5 text-emerald-400" />;
  };

  const DirectionalArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'group relative flex w-full flex-col items-start gap-3 rounded-xl border p-4 text-start transition-all duration-200',
        'bg-[var(--bg-elevated)] border-[var(--border-subtle)]',
        'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/10 hover:border-emerald-500/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
        isActive && 'border-emerald-500/50 bg-emerald-500/5 shadow-md shadow-emerald-900/10',
        isLocked && 'opacity-80',
      )}
    >
      {/* Top row: icon + name + category */}
      <div className="flex w-full items-start gap-3">
        {/* Icon circle */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2',
            isActive
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-emerald-500/30 bg-emerald-500/5',
          )}
        >
          {renderIcon()}
        </div>

        <div className="min-w-0 flex-1">
          {/* Name */}
          <h4 className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {persona.name}
          </h4>
          {/* Category */}
          {categoryName && (
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {categoryName}
            </p>
          )}
        </div>
      </div>

      {/* Description – 2 line clamp */}
      <p className="line-clamp-2 w-full text-xs leading-relaxed text-[var(--text-secondary)]">
        {persona.description}
      </p>

      {/* Bottom row: badges + arrow */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {renderTypeBadge()}
          {categoryName && (
            <Badge
              variant="outline"
              className="border-[var(--border-subtle)] text-[var(--text-muted)] text-xs"
            >
              {categoryName}
            </Badge>
          )}
        </div>
        <DirectionalArrow
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200',
            isRTL
              ? 'group-hover:-translate-x-1'
              : 'group-hover:translate-x-1',
          )}
        />
      </div>

      {/* Premium lock shimmer overlay */}
      {isLocked && persona.type === 'premium' && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/20 backdrop-blur-[1px]">
          <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1.5 border border-amber-500/30">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-medium text-amber-300">
              {t('premiumLock.badge')}
            </span>
          </div>
        </div>
      )}
    </button>
  );
}