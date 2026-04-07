'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export default function NotFoundPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ar';
  const router = useRouter();
  const t = useTranslations('errors');

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-4">
      <EmptyState
        icon={<SearchX className="h-12 w-12" />}
        title={t('notFound.title')}
        description={t('notFound.description')}
        action={{
          label: t('notFound.cta'),
          onClick: () => router.push(`/${locale}/chat`),
        }}
      />
    </div>
  );
}