'use client';

import { useTranslations } from 'next-intl';
import { UsersTable } from '@/components/admin/UsersTable';

export default function AdminUsersPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t('users.title')}
      </h1>
      <UsersTable />
    </div>
  );
}