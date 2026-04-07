import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/common/Logo';

// ---------------------------------------------------------------------------
// Dynamic metadata — translated
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'meta' });
  return {

    description: t('loginDescription'),
    robots: { index: false, follow: false },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function LoginPage({
  params,
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale: params.locale, namespace: 'auth' });

  return (
    /*
     * Full-viewport centred layout — no sidebar, no top nav.
     * Relies on CSS variables from the global theme (emerald & gold).
     */
    <main
      className="
        flex min-h-screen flex-col items-center justify-center
        bg-[var(--bg-primary)] px-4 py-12
      "
    >
      {/* Brand mark */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <Logo size="lg" />
        <p className="max-w-xs text-center text-sm text-[var(--text-muted)]">
          {t('login.tagline')}
        </p>
      </div>

      {/* Auth card */}
      <div
        className="
          w-full max-w-[420px] rounded-2xl
          bg-[var(--bg-elevated)] shadow-[var(--shadow-elevation-2)]
          border border-[var(--border-default)]
          px-6 py-8
          sm:px-8
        "
      >
        <h1 className="mb-6 text-xl font-semibold text-[var(--text-primary)]">
          {t('login.heading')}
        </h1>

        {/* Client component — LoginForm handles all form state */}
        <LoginForm />
      </div>

      {/* Footer note */}
      <p className="mt-8 text-xs text-[var(--text-muted)]">
        {t('login.footerNote')}
      </p>
    </main>
  );
}