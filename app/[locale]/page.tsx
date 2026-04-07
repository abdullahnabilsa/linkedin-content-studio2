'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Bot,
  Layers,
  BarChart3,
  BookOpen,
  Globe2,
  Gem,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  Zap,
  Shield,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/common/Logo';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';

/* ────────────────────────────────────────────────────────── */
/* Feature card data (i18n keys)                               */
/* ────────────────────────────────────────────────────────── */
interface FeatureItem {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: <Bot className="h-6 w-6" />,
    titleKey: 'features.ai.title',
    descKey: 'features.ai.desc',
  },
  {
    icon: <Layers className="h-6 w-6" />,
    titleKey: 'features.personas.title',
    descKey: 'features.personas.desc',
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    titleKey: 'features.scoring.title',
    descKey: 'features.scoring.desc',
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    titleKey: 'features.library.title',
    descKey: 'features.library.desc',
  },
  {
    icon: <Globe2 className="h-6 w-6" />,
    titleKey: 'features.bilingual.title',
    descKey: 'features.bilingual.desc',
  },
  {
    icon: <Gem className="h-6 w-6" />,
    titleKey: 'features.affordable.title',
    descKey: 'features.affordable.desc',
  },
];

/* ────────────────────────────────────────────────────────── */
/* Comparison row type                                         */
/* ────────────────────────────────────────────────────────── */
interface ComparisonRow {
  featureKey: string;
  chatgpt: boolean;
  competitors: boolean;
  us: boolean;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  { featureKey: 'compare.multiAi', chatgpt: false, competitors: true, us: true },
  { featureKey: 'compare.linkedinPersonas', chatgpt: false, competitors: false, us: true },
  { featureKey: 'compare.contentScoring', chatgpt: false, competitors: true, us: true },
  { featureKey: 'compare.postLibrary', chatgpt: false, competitors: true, us: true },
  { featureKey: 'compare.arabicRtl', chatgpt: false, competitors: false, us: true },
  { featureKey: 'compare.freeTier', chatgpt: false, competitors: false, us: true },
  { featureKey: 'compare.privateKeys', chatgpt: false, competitors: false, us: true },
];

/* ────────────────────────────────────────────────────────── */
/* Pricing plan type                                           */
/* ────────────────────────────────────────────────────────── */
interface PlanFeature {
  key: string;
}

const FREE_FEATURES: PlanFeature[] = [
  { key: 'pricing.free.f1' },
  { key: 'pricing.free.f2' },
  { key: 'pricing.free.f3' },
  { key: 'pricing.free.f4' },
  { key: 'pricing.free.f5' },
  { key: 'pricing.free.f6' },
];

const PREMIUM_FEATURES: PlanFeature[] = [
  { key: 'pricing.premium.f1' },
  { key: 'pricing.premium.f2' },
  { key: 'pricing.premium.f3' },
  { key: 'pricing.premium.f4' },
  { key: 'pricing.premium.f5' },
  { key: 'pricing.premium.f6' },
  { key: 'pricing.premium.f7' },
  { key: 'pricing.premium.f8' },
];

/* ────────────────────────────────────────────────────────── */
/* Component                                                   */
/* ────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'ar';
  const isRTL = locale === 'ar';
  const router = useRouter();
  const t = useTranslations('landing');
  const { user } = useAuthStore();

  const [darkMode, setDarkMode] = useState(true);

  /* Redirect authenticated users straight to /chat */
  useEffect(() => {
    if (user) {
      router.replace(`/${locale}/chat`);
    }
  }, [user, locale, router]);

  /* Theme toggle */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  /* Locale toggle */
  const toggleLocale = () => {
    const next = locale === 'ar' ? 'en' : 'ar';
    router.push(`/${next}`);
  };

  const DirectionalArrow = isRTL ? ArrowLeft : ArrowRight;

  /* If authenticated, render nothing while redirect fires */
  if (user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* ─── Sticky header ──────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo size="md" />

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLocale}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {locale === 'ar' ? 'EN' : 'عربي'}
            </Button>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Auth buttons */}
            <Link href={`/${locale}/login`}>
              <Button
                variant="ghost"
                size="sm"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {t('header.login')}
              </Button>
            </Link>
            <Link href={`/${locale}/register`}>
              <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                {t('header.register')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ───────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Decorative background gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
          <div className="absolute start-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.07] blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">
              {t('hero.badge')}
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-[var(--text-primary)]">{t('hero.titleLine1')}</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              {t('hero.titleLine2')}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
            {t('hero.description')}
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href={`/${locale}/register`}>
              <Button size="lg" className="gap-2 bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 px-8">
                {t('hero.ctaPrimary')}
                <DirectionalArrow className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="gap-2 border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] px-8">
                {t('hero.ctaSecondary')}
              </Button>
            </a>
          </div>

          {/* Trust line */}
          <p className="mt-6 text-xs text-[var(--text-muted)]">
            {t('hero.trust')}
          </p>
        </div>
      </section>

      {/* ─── FEATURES ───────────────────────────────── */}
      <section id="features" className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">{t('features.heading')}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('features.subheading')}</p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={cn(
                  'group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 transition-all duration-200',
                  'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5 hover:border-emerald-500/30',
                )}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 transition-colors group-hover:bg-emerald-500/20">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {t(f.titleKey)}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {t(f.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─────────────────────────────── */}
      <section className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">{t('compare.heading')}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('compare.subheading')}</p>
          </div>

          <div className="mt-10 overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <th className="px-4 py-3 text-start font-medium text-[var(--text-secondary)]">
                    {t('compare.feature')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-[var(--text-muted)]">
                    ChatGPT
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-[var(--text-muted)]">
                    {t('compare.competitors')}
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-emerald-400 bg-emerald-500/5 rounded-te-xl">
                    {t('compare.us')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b border-[var(--border-subtle)] last:border-b-0',
                      i % 2 === 0 ? 'bg-[var(--bg-primary)]' : 'bg-[var(--bg-elevated)]/50',
                    )}
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {t(row.featureKey)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.chatgpt ? (
                        <Check className="mx-auto h-4 w-4 text-emerald-400" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-red-400/60" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.competitors ? (
                        <Check className="mx-auto h-4 w-4 text-emerald-400" />
                      ) : (
                        <X className="mx-auto h-4 w-4 text-red-400/60" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-center bg-emerald-500/5">
                      <Check className="mx-auto h-4 w-4 text-emerald-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── PRICING ────────────────────────────────── */}
      <section id="pricing" className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">{t('pricing.heading')}</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('pricing.subheading')}</p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {/* FREE plan */}
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-bold">{t('pricing.free.name')}</h3>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{t('pricing.free.tagline')}</p>

              <div className="mt-6">
                <span className="text-3xl font-extrabold">{t('pricing.free.price')}</span>
                <span className="text-sm text-[var(--text-muted)]"> / {t('pricing.forever')}</span>
              </div>

              <ul className="mt-6 space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f.key} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{t(f.key)}</span>
                  </li>
                ))}
              </ul>

              <Link href={`/${locale}/register`} className="mt-8 block">
                <Button variant="outline" className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  {t('pricing.free.cta')}
                </Button>
              </Link>
            </div>

            {/* PREMIUM plan */}
            <div className="relative rounded-2xl border-2 border-emerald-500/40 bg-[var(--bg-elevated)] p-6 shadow-lg shadow-emerald-900/10 sm:p-8">
              {/* Popular badge */}
              <div className="absolute -top-3 start-4 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                <Zap className="h-3 w-3" />
                {t('pricing.premium.badge')}
              </div>

              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold">{t('pricing.premium.name')}</h3>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{t('pricing.premium.tagline')}</p>

              <div className="mt-6">
                <span className="text-3xl font-extrabold">$9</span>
                <span className="text-sm text-[var(--text-muted)]"> / {t('pricing.month')}</span>
              </div>
              <p className="mt-1 text-xs text-emerald-400">
                {t('pricing.premium.annual')}
              </p>

              <ul className="mt-6 space-y-3">
                {PREMIUM_FEATURES.map((f) => (
                  <li key={f.key} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{t(f.key)}</span>
                  </li>
                ))}
              </ul>

              <Link href={`/${locale}/register`} className="mt-8 block">
                <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-900/20">
                  {t('pricing.premium.cta')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ──────────────────────────────── */}
      <section className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('cta.heading')}</h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{t('cta.subheading')}</p>
          <Link href={`/${locale}/register`} className="mt-8 inline-block">
            <Button size="lg" className="gap-2 bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 px-10">
              {t('cta.button')}
              <DirectionalArrow className="h-4 w-4" />
            </Button>
          </Link>
          <p className="mt-4 text-xs text-[var(--text-muted)]">{t('cta.note')}</p>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────── */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-xs text-[var(--text-muted)]">
              © {new Date().getFullYear()} {t('footer.copyright')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleLocale} className="text-xs text-[var(--text-muted)]">
              {locale === 'ar' ? 'English' : 'العربية'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="text-[var(--text-muted)]"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}