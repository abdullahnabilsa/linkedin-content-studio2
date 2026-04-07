'use client';

import { useTranslations } from 'next-intl';
import { SystemSettings } from '@/components/admin/SystemSettings';
import { TelegramSettings } from '@/components/admin/TelegramSettings';

export default function AdminSettingsPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        {t('settings.title')}
      </h1>
      <SystemSettings />
      <TelegramSettings />
    </div>
  );
}