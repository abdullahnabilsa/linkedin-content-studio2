'use client';

import { useTranslations } from 'next-intl';
import { ApiKeysTable } from '@/components/admin/ApiKeysTable';

export default function AdminApiKeysPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t('apiKeys.title')}
      </h1>
      <ApiKeysTable />
    </div>
  );
}