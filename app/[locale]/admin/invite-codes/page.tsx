'use client';

import { useTranslations } from 'next-intl';
import { InviteCodesTable } from '@/components/admin/InviteCodesTable';

export default function AdminInviteCodesPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t('inviteCodes.title')}
      </h1>
      <InviteCodesTable />
    </div>
  );
}