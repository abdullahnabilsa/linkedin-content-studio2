'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Star, Lock, Clock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Persona } from '@/types/persona';

interface PremiumPersonaLockProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to open/close */
  onOpenChange: (open: boolean) => void;
  /** The premium persona that is locked */
  persona: Persona | null;
  /** Why the persona is locked */
  reason: 'already_tried' | 'daily_limit' | null;
  /** Number of premium personas tried today */
  premiumTrialsToday: number;
  /** Max trials per day from system config */
  maxPremiumTrialsPerDay: number;
  /** Current locale */
  locale?: string;
}

export function PremiumPersonaLock({
  open,
  onOpenChange,
  persona,
  reason,
  premiumTrialsToday,
  maxPremiumTrialsPerDay,
  locale = 'ar',
}: PremiumPersonaLockProps) {
  const t = useTranslations('personas');
  const router = useRouter();

  if (!persona) return null;

  const isAlreadyTried = reason === 'already_tried';
  const isDailyLimit = reason === 'daily_limit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--bg-elevated)] border-[var(--border-default)] sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30">
            {isDailyLimit ? (
              <Lock className="h-7 w-7 text-amber-400" />
            ) : (
              <Clock className="h-7 w-7 text-amber-400" />
            )}
          </div>

          <DialogTitle className="mt-3 text-lg font-bold text-[var(--text-primary)]">
            {isDailyLimit
              ? t('premiumLock.dailyLimitTitle')
              : t('premiumLock.alreadyTriedTitle')}
          </DialogTitle>

          <DialogDescription className="text-sm text-[var(--text-secondary)]">
            {isDailyLimit
              ? t('premiumLock.dailyLimitDescription', {
                  used: premiumTrialsToday,
                  max: maxPremiumTrialsPerDay,
                })
              : t('premiumLock.alreadyTriedDescription', {
                  name: persona.name,
                })}
          </DialogDescription>
        </DialogHeader>

        {/* Persona info card */}
        <div className="my-2 flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
            {persona.icon_url && !persona.icon_url.startsWith('http') ? (
              <span className="text-lg">{persona.icon_url}</span>
            ) : persona.icon_url ? (
              <img
                src={persona.icon_url}
                alt={persona.name}
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {persona.name}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {persona.description}
            </p>
          </div>
        </div>

        {/* Trial info */}
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 text-amber-400">
            <Star className="h-3.5 w-3.5 fill-amber-400" />
            <span className="text-xs font-medium">
              {t('premiumLock.trialCounter', {
                used: premiumTrialsToday,
                max: maxPremiumTrialsPerDay,
              })}
            </span>
          </div>
          {isAlreadyTried && (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {t('premiumLock.tryTomorrow')}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={() => {
              onOpenChange(false);
              router.push(`/${locale}/settings`);
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-emerald-500 text-white hover:from-amber-600 hover:to-emerald-600 gap-2"
          >
            <Crown className="h-4 w-4" />
            {t('premiumLock.upgradeButton')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            {t('premiumLock.closeButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}