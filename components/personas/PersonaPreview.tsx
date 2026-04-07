'use client';

import { useTranslations } from 'next-intl';
import { PersonaCard } from '@/components/personas/PersonaCard';
import type { Persona } from '@/types/persona';

interface PersonaPreviewProps {
  /** The persona to preview */
  persona: Persona;
  /** Category name for display */
  categoryName?: string;
  /** Current locale */
  locale?: string;
}

export function PersonaPreview({ persona, categoryName, locale = 'ar' }: PersonaPreviewProps) {
  const t = useTranslations('personas');

  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--text-muted)] text-center">
        {t('preview.description')}
      </p>

      {/* Render the persona card in preview mode (non-interactive) */}
      <div className="pointer-events-none">
        <PersonaCard
          persona={persona}
          categoryName={categoryName}
          locale={locale}
        />
      </div>

      {/* System prompt preview */}
      {persona.system_prompt && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            {t('preview.systemPromptLabel')}
          </p>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-[var(--text-secondary)] font-mono">
              {persona.system_prompt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}