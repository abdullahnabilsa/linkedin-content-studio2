'use client';

import { useTranslations } from 'next-intl';
import { ModelsManager } from '@/components/admin/ModelsManager';

export default function AdminModelsPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t('models.title')}
      </h1>
      <ModelsManager />
    </div>
  );
}