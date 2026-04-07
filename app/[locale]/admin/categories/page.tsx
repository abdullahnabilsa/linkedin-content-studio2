'use client';

import { useTranslations } from 'next-intl';
import { CategoriesManager } from '@/components/admin/CategoriesManager';

export default function AdminCategoriesPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t('categories.title')}
      </h1>
      <CategoriesManager />
    </div>
  );
}