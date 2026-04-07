'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// ---------------------------------------------------------------------------
// Simple email regex — good enough for client-side UX feedback
// ---------------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const { signIn } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field-level validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Validation
  // ---------------------------------------------------------------------------
  const validate = useCallback((): boolean => {
    let valid = true;

    if (!email.trim()) {
      setEmailError(t('errors.emailRequired'));
      valid = false;
    } else if (!EMAIL_RE.test(email.trim())) {
      setEmailError(t('errors.emailInvalid'));
      valid = false;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError(t('errors.passwordRequired'));
      valid = false;
    } else {
      setPasswordError(null);
    }

    return valid;
  }, [email, password, t]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(null);

      if (!validate()) return;

      setIsSubmitting(true);
      try {
        await signIn(email.trim(), password);

        // Preserve invite code in URL so the user lands on the invite page
        const code = searchParams.get('code');
        const next = searchParams.get('next');

        if (code) {
          router.push(`/${locale}/invite/${code}`);
        } else if (next) {
          router.push(next);
        } else {
          router.push(`/${locale}/chat`);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t('errors.unknown');

        // Translate common Supabase error messages
        if (
          message.toLowerCase().includes('invalid login credentials') ||
          message.toLowerCase().includes('invalid_credentials')
        ) {
          setError(t('errors.invalidCredentials'));
        } else if (message.toLowerCase().includes('banned')) {
          setError(t('errors.accountSuspended'));
        } else if (message.toLowerCase().includes('email not confirmed')) {
          setError(t('errors.emailNotConfirmed'));
        } else {
          setError(t('errors.unknown'));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, signIn, email, password, searchParams, router, locale, t]
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full space-y-5"
      aria-label={t('login.formLabel')}
    >
      {/* Global error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Email */}
      <div className="space-y-1.5">
        <label
          htmlFor="login-email"
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          {t('fields.email')}
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('fields.emailPlaceholder')}
          disabled={isSubmitting}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'login-email-error' : undefined}
          className={[
            'h-12 w-full rounded-lg border bg-[var(--bg-input)] px-4 text-sm',
            'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'outline-none transition-colors duration-150',
            'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25',
            emailError
              ? 'border-red-500/60'
              : 'border-[var(--border-default)] hover:border-[var(--border-hover)]',
            isSubmitting ? 'cursor-not-allowed opacity-60' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {emailError && (
          <p id="login-email-error" role="alert" className="text-xs text-red-400">
            {emailError}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="login-password"
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          {t('fields.password')}
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('fields.passwordPlaceholder')}
            disabled={isSubmitting}
            aria-invalid={!!passwordError}
            aria-describedby={passwordError ? 'login-password-error' : undefined}
            className={[
              'h-12 w-full rounded-lg border bg-[var(--bg-input)] ps-4 pe-12 text-sm',
              'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
              'outline-none transition-colors duration-150',
              'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25',
              passwordError
                ? 'border-red-500/60'
                : 'border-[var(--border-default)] hover:border-[var(--border-hover)]',
              isSubmitting ? 'cursor-not-allowed opacity-60' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t('fields.hidePassword') : t('fields.showPassword')}
            tabIndex={-1}
            className="absolute inset-y-0 end-0 flex items-center pe-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {passwordError && (
          <p id="login-password-error" role="alert" className="text-xs text-red-400">
            {passwordError}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={[
          'relative h-12 w-full rounded-lg text-sm font-semibold',
          'bg-[var(--color-accent)] text-[var(--color-accent-foreground)]',
          'transition-all duration-150',
          'hover:brightness-110 active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
          isSubmitting ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t('login.signingIn')}
          </span>
        ) : (
          t('login.submit')
        )}
      </button>

      {/* Sign-up link */}
      <p className="text-center text-sm text-[var(--text-muted)]">
        {t('login.noAccount')}{' '}
        <Link
          href={`/${locale}/register`}
          className="font-medium text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
        >
          {t('login.signUpLink')}
        </Link>
      </p>
    </form>
  );
}