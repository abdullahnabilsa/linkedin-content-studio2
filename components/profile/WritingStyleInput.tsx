'use client';

import { useTranslations } from 'next-intl';

interface WritingStyleInputProps {
  value: string;
  onChange: (value: string) => void;
}

const MAX_CHARS = 5000;
const RECOMMENDED_MIN = 100;

export function WritingStyleInput({ value, onChange }: WritingStyleInputProps) {
  const t = useTranslations('settings');
  const charCount = value.length;
  const isShort = charCount > 0 && charCount < RECOMMENDED_MIN;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-[var(--text-secondary)]">
        {t('profile.writingSamples', { defaultMessage: 'Writing Samples' })}
      </label>
      <p className="text-xs text-[var(--text-tertiary)]">
        {t('profile.writingSamplesHint', {
          defaultMessage: 'Paste 2\u20135 of your best LinkedIn posts. The AI will learn your writing style.',
        })}
      </p>
      <textarea
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= MAX_CHARS) onChange(e.target.value);
        }}
        rows={8}
        placeholder={t('profile.writingSamplesPlaceholder', {
          defaultMessage: 'Paste your LinkedIn posts here, separated by a blank line...',
        })}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border-primary)]
                   bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm
                   placeholder:text-[var(--text-tertiary)]
                   focus:outline-none focus:border-emerald-500 transition-colors resize-none"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={isShort ? 'text-amber-400' : 'text-[var(--text-tertiary)]'}>
          {isShort
            ? t('profile.writingTooShort', { defaultMessage: 'Add more text for better style matching (min 100 chars)' })
            : ' '}
        </span>
        <span className={`${charCount >= MAX_CHARS ? 'text-red-400' : 'text-[var(--text-tertiary)]'}`}>
          {charCount.toLocaleString()}/{MAX_CHARS.toLocaleString()}
        </span>
      </div>
    </div>
  );
}