'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, Plus, Star, Sparkles, User, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PersonaCard } from '@/components/personas/PersonaCard';
import { PremiumPersonaLock } from '@/components/personas/PremiumPersonaLock';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { EmptyState } from '@/components/common/EmptyState';
import { usePersonas } from '@/hooks/usePersonas';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';
import type { Persona } from '@/types/persona';

interface PersonaLibraryProps {
  locale?: string;
}

export function PersonaLibrary({ locale = 'ar' }: PersonaLibraryProps) {
  const t = useTranslations('personas');
  const router = useRouter();
  const { profile } = useAuthStore();
  const {
    basicPersonas,
    premiumPersonas,
    customPersonas,
    categories,
    activePersona,
    setActivePersona,
    canTryPremium,
    premiumTrialsToday,
    maxPremiumTrialsPerDay,
    isLoading,
    error,
  } = usePersonas();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showPremiumLock, setShowPremiumLock] = useState(false);
  const [selectedLockedPersona, setSelectedLockedPersona] = useState<Persona | null>(null);
  const [lockReason, setLockReason] = useState<'already_tried' | 'daily_limit' | null>(null);

  const userRole = profile?.role ?? 'free';
  const isFree = userRole === 'free';

  /* ── category counts ──────────────────────────────────── */
  const allPersonas = useMemo(
    () => [...basicPersonas, ...premiumPersonas, ...customPersonas],
    [basicPersonas, premiumPersonas, customPersonas],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const persona of allPersonas) {
      const catId = persona.category_id ?? 'uncategorized';
      counts[catId] = (counts[catId] ?? 0) + 1;
    }
    return counts;
  }, [allPersonas]);

  /* ── filtering logic ──────────────────────────────────── */
  const filterPersonas = useCallback(
    (list: Persona[]): Persona[] => {
      let filtered = list;

      if (activeCategoryId) {
        filtered = filtered.filter((p) => p.category_id === activeCategoryId);
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            (p.name_en?.toLowerCase().includes(query) ?? false) ||
            p.description.toLowerCase().includes(query) ||
            (p.description_en?.toLowerCase().includes(query) ?? false),
        );
      }

      return filtered;
    },
    [activeCategoryId, searchQuery],
  );

  const filteredBasic = useMemo(() => filterPersonas(basicPersonas), [filterPersonas, basicPersonas]);
  const filteredPremium = useMemo(() => filterPersonas(premiumPersonas), [filterPersonas, premiumPersonas]);
  const filteredCustom = useMemo(() => filterPersonas(customPersonas), [filterPersonas, customPersonas]);

  /* ── category name resolver ───────────────────────────── */
  const getCategoryName = useCallback(
    (categoryId: string | null): string | undefined => {
      if (!categoryId) return undefined;
      const cat = categories.find((c) => c.id === categoryId);
      if (!cat) return undefined;
      return locale === 'ar' ? cat.name : cat.name_en;
    },
    [categories, locale],
  );

  /* ── activate persona handler ─────────────────────────── */
  const handleActivate = useCallback(
    async (persona: Persona) => {
      /* Basic and custom: always activate directly */
      if (persona.type === 'basic' || persona.type === 'custom') {
        setActivePersona(persona);
        router.push(`/${locale}/chat`);
        return;
      }

      /* Premium: check access */
      if (persona.type === 'premium') {
        if (!isFree) {
          /* Premium/admin users: activate directly */
          setActivePersona(persona);
          router.push(`/${locale}/chat`);
          return;
        }

        /* Free user: check trial availability */
        const canTry = await canTryPremium(persona.id);
        if (canTry) {
          setActivePersona(persona);
          router.push(`/${locale}/chat`);
        } else {
          /* Determine the reason */
          setSelectedLockedPersona(persona);
          if (premiumTrialsToday >= maxPremiumTrialsPerDay) {
            setLockReason('daily_limit');
          } else {
            setLockReason('already_tried');
          }
          setShowPremiumLock(true);
        }
      }
    },
    [
      isFree,
      setActivePersona,
      canTryPremium,
      premiumTrialsToday,
      maxPremiumTrialsPerDay,
      router,
      locale,
    ],
  );

  /* ── section renderer ─────────────────────────────────── */
  const renderSection = (
    title: string,
    icon: React.ReactNode,
    list: Persona[],
    subtitle?: string,
    showCreateCard?: boolean,
  ) => {
    if (list.length === 0 && !showCreateCard) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          <span className="text-xs text-[var(--text-muted)]">({list.length})</span>
        </div>
        {subtitle && (
          <p className="text-xs text-[var(--text-muted)] -mt-2">{subtitle}</p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onActivate={handleActivate}
              isActive={activePersona?.id === persona.id}
              isLocked={isFree && persona.type === 'premium'}
              categoryName={getCategoryName(persona.category_id)}
              locale={locale}
            />
          ))}
          {showCreateCard && (
            <button
              type="button"
              onClick={() => router.push(`/${locale}/personas/create`)}
              className={cn(
                'flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 transition-all',
                'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
                'hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:shadow-md',
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{t('library.createNew')}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  /* ── loading state ────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  /* ── error state ──────────────────────────────────────── */
  if (error) {
    return (
      <EmptyState
        icon={<Layers className="h-12 w-12 text-red-400" />}
        title={t('library.errorTitle')}
        description={error}
      />
    );
  }

  /* ── empty state if no personas at all ────────────────── */
  const totalCount = allPersonas.length;
  if (totalCount === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={<Layers className="h-12 w-12 text-[var(--text-muted)]" />}
          title={t('library.emptyTitle')}
          description={t('library.emptyDescription')}
        />
        {/* Still show the create card for custom */}
        <div className="flex justify-center">
          <Button
            onClick={() => router.push(`/${locale}/personas/create`)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('library.createNew')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Search + filter bar ──────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('library.searchPlaceholder')}
            className="ps-9 bg-[var(--bg-primary)] border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        {/* Premium trial info for free users */}
        {isFree && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            <span>
              {t('library.premiumTrialInfo', {
                used: premiumTrialsToday,
                max: maxPremiumTrialsPerDay,
              })}
            </span>
          </div>
        )}
      </div>

      {/* ── Category tabs ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
        <button
          type="button"
          onClick={() => setActiveCategoryId(null)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
            activeCategoryId === null
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-emerald-500/20',
          )}
        >
          {t('library.categoryAll')} ({totalCount})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategoryId(cat.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              activeCategoryId === cat.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-emerald-500/20',
            )}
          >
            {cat.icon ? `${cat.icon} ` : ''}
            {locale === 'ar' ? cat.name : cat.name_en}
            {categoryCounts[cat.id] !== undefined && ` (${categoryCounts[cat.id]})`}
          </button>
        ))}
      </div>

      {/* ── Persona sections ─────────────────────────── */}
      <div className="space-y-8">
        {/* Basic Personas */}
        {(!activeCategoryId || filteredBasic.length > 0) &&
          renderSection(
            t('library.sectionBasic'),
            <Sparkles className="h-4 w-4 text-emerald-400" />,
            filteredBasic,
          )}

        {/* Premium Personas */}
        {(!activeCategoryId || filteredPremium.length > 0) &&
          renderSection(
            t('library.sectionPremium'),
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />,
            filteredPremium,
            isFree ? t('library.premiumNote') : undefined,
          )}

        {/* Custom Personas (user's own) */}
        {(!activeCategoryId || filteredCustom.length > 0) &&
          renderSection(
            t('library.sectionCustom'),
            <User className="h-4 w-4 text-[var(--text-secondary)]" />,
            filteredCustom,
            undefined,
            true, /* showCreateCard */
          )}

        {/* Empty search results */}
        {filteredBasic.length === 0 &&
          filteredPremium.length === 0 &&
          filteredCustom.length === 0 &&
          (searchQuery || activeCategoryId) && (
            <EmptyState
              icon={<Search className="h-10 w-10 text-[var(--text-muted)]" />}
              title={t('library.noResults')}
              description={t('library.noResultsDescription')}
            />
          )}
      </div>

      {/* ── Premium persona lock dialog ──────────────── */}
      <PremiumPersonaLock
        open={showPremiumLock}
        onOpenChange={setShowPremiumLock}
        persona={selectedLockedPersona}
        reason={lockReason}
        premiumTrialsToday={premiumTrialsToday}
        maxPremiumTrialsPerDay={maxPremiumTrialsPerDay}
        locale={locale}
      />
    </div>
  );
}