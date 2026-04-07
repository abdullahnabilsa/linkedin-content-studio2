'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorMessage } from '@/components/common/ErrorMessage';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ar';
  const router = useRouter();
  const t = useTranslations('errors');

  /* Log the error in development for debugging */
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary]', error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-primary)] px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
        <AlertCircle className="h-8 w-8 text-red-400" />
      </div>

      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          {t('generic.title')}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t('generic.description')}
        </p>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <ErrorMessage message={error.message} type="error" className="max-w-lg" />
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={reset}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {t('generic.retry')}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/chat`)}
          className="border-[var(--border-default)] text-[var(--text-secondary)]"
        >
          {t('generic.goHome')}
        </Button>
      </div>
    </div>
  );
}