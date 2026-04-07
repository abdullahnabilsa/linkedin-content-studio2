'use client';

import { useTranslations } from 'next-intl';
import { PersonasManager } from '@/components/admin/PersonasManager';

export default function AdminPersonasPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t('personas.title')}
      </h1>
      <PersonasManager />
    </div>
  );
}