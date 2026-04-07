'use client';

/**
 * FormatTemplateBar
 *
 * Horizontal row of format-template pills rendered above the
 * message input. The active template is stored in personaStore
 * and consumed by the chat route to inject formatting instructions.
 */

import { useTranslations } from 'next-intl';
import { usePersonaStore } from '@/stores/personaStore';
import { FORMAT_TEMPLATES } from '@/utils/constants';

export function FormatTemplateBar() {
  const t = useTranslations('chat');
  const { activeFormatTemplate, setActiveFormatTemplate } = usePersonaStore();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-1">
      {FORMAT_TEMPLATES.map((tpl) => {
        const isActive = activeFormatTemplate === tpl.id;
        return (
          <button
            key={tpl.id}
            onClick={() => setActiveFormatTemplate(tpl.id)}
            className={`
              shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl
              text-xs font-medium transition-all duration-150 select-none
              border whitespace-nowrap
              ${isActive
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/20'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:border-emerald-500/40 hover:text-[var(--text-primary)]'
              }
            `}
            title={t(`formats.${tpl.id}Description`, { defaultMessage: tpl.label })}
          >
            <span className="text-sm" role="img" aria-hidden="true">{tpl.icon}</span>
            <span>{t(`formats.${tpl.id}`, { defaultMessage: tpl.label })}</span>
          </button>
        );
      })}
    </div>
  );
}