'use client';

import { useTranslations } from 'next-intl';
import { NotificationsList } from '@/components/admin/NotificationsList';

export default function AdminNotificationsPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t('notifications.title')}
      </h1>
      <NotificationsList />
    </div>
  );
}