'use client';

import { useTranslations } from 'next-intl';

interface ProfileCompletionBarProps {
  percent: number;
}

function getMessage(pct: number, t: ReturnType<typeof useTranslations>): string {
  if (pct === 100) return t('completion.complete', { defaultMessage: 'Profile complete! You\u2019re all set.' });
  if (pct >= 80) return t('completion.almostThere', { defaultMessage: 'Almost there! Just a few more fields.' });
  if (pct >= 50) return t('completion.halfway', { defaultMessage: 'Good progress! Keep going for better results.' });
  if (pct >= 25) return t('completion.started', { defaultMessage: 'Great start! Add more details for personalised content.' });
  return t('completion.empty', { defaultMessage: 'Complete your profile for AI-personalised content.' });
}

export function ProfileCompletionBar({ percent }: ProfileCompletionBarProps) {
  const t = useTranslations('settings');
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          {t('profile.completion', { defaultMessage: 'Profile Completion' })}
        </span>
        <span className="text-sm font-bold text-emerald-400">{clamped}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400
                     transition-all duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-xs text-[var(--text-tertiary)]">{getMessage(clamped, t)}</p>
    </div>
  );
}