'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Wand2 } from 'lucide-react';
import { PersonaForm } from '@/components/personas/PersonaForm';

export default function CreatePersonaPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ar';
  const t = useTranslations('personas');

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Wand2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">
              {t('create.pageTitle')}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {t('create.pageSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <PersonaForm locale={locale} />
      </div>
    </div>
  );
}