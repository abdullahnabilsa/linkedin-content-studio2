'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

// ---------------------------------------------------------------------------
// Password strength helpers
// ---------------------------------------------------------------------------
type PasswordStrength = 'invalid' | 'weak' | 'fair' | 'strong';

interface StrengthResult {
  level: PasswordStrength;
  score: number; // 0-4
}

function evaluatePasswordStrength(password: string): StrengthResult {
  if (password.length < 8) return { level: 'invalid', score: 0 };

  let score = 0;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score >= 5) return { level: 'strong', score: 4 };
  if (password.length >= 12) return { level: 'fair', score: 3 };
  return { level: 'weak', score: 2 };
}

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  invalid: 'bg-[var(--border-default)]',
  weak: 'bg-red-500',
  fair: 'bg-yellow-400',
  strong: 'bg-[var(--color-accent)]',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function RegisterForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  const { signUp } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Field-level errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Password strength — derived from password state
  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);

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

    if (strength.level === 'invalid') {
      setPasswordError(t('errors.passwordTooShort'));
      valid = false;
    } else {
      setPasswordError(null);
    }

    if (!confirmPassword) {
      setConfirmError(t('errors.confirmPasswordRequired'));
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmError(t('errors.passwordsMismatch'));
      valid = false;
    } else {
      setConfirmError(null);
    }

    return valid;
  }, [email, password, confirmPassword, strength, t]);

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
        await signUp(email.trim(), password);

        // If the user came from an invite link, send them to activate it
        const code = searchParams.get('code');
        if (code) {
          router.push(`/${locale}/invite/${code}`);
        } else {
          router.push(`/${locale}/chat`);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t('errors.unknown');

        if (
          message.toLowerCase().includes('already registered') ||
          message.toLowerCase().includes('user already exists')
        ) {
          setError(t('errors.emailAlreadyRegistered'));
        } else {
          setError(t('errors.unknown'));
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [validate, signUp, email, password, searchParams, router, locale, t]
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  /** 4-segment strength bar */
  const StrengthBar = () => {
    if (!password) return null;
    const colorClass = STRENGTH_COLORS[strength.level];
    const filledSegments =
      strength.level === 'invalid'
        ? 1
        : strength.level === 'weak'
        ? 1
        : strength.level === 'fair'
        ? 2
        : 4;

    return (
      <div className="mt-2 space-y-1.5" aria-hidden="true">
        <div className="flex gap-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={[
                'h-1 flex-1 rounded-full transition-colors duration-300',
                i < filledSegments ? colorClass : 'bg-[var(--border-default)]',
              ].join(' ')}
            />
          ))}
        </div>
        {strength.level !== 'invalid' && (
          <p
            className={[
              'text-xs',
              strength.level === 'weak'
                ? 'text-red-400'
                : strength.level === 'fair'
                ? 'text-yellow-400'
                : 'text-[var(--color-accent)]',
            ].join(' ')}
          >
            {t(`passwordStrength.${strength.level}`)}
          </p>
        )}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="w-full space-y-5"
      aria-label={t('register.formLabel')}
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
          htmlFor="register-email"
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          {t('fields.email')}
        </label>
        <input
          id="register-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('fields.emailPlaceholder')}
          disabled={isSubmitting}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'reg-email-error' : undefined}
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
          <p id="reg-email-error" role="alert" className="text-xs text-red-400">
            {emailError}
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="register-password"
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          {t('fields.password')}
        </label>
        <div className="relative">
          <input
            id="register-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('fields.passwordPlaceholder')}
            disabled={isSubmitting}
            aria-invalid={!!passwordError}
            aria-describedby="reg-password-hint"
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
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t('fields.hidePassword') : t('fields.showPassword')}
            className="absolute inset-y-0 end-0 flex items-center pe-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        <StrengthBar />
        {passwordError && (
          <p id="reg-password-hint" role="alert" className="text-xs text-red-400">
            {passwordError}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="register-confirm"
          className="block text-sm font-medium text-[var(--text-secondary)]"
        >
          {t('fields.confirmPassword')}
        </label>
        <div className="relative">
          <input
            id="register-confirm"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('fields.confirmPasswordPlaceholder')}
            disabled={isSubmitting}
            aria-invalid={!!confirmError}
            aria-describedby={confirmError ? 'reg-confirm-error' : undefined}
            className={[
              'h-12 w-full rounded-lg border bg-[var(--bg-input)] ps-4 pe-12 text-sm',
              'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
              'outline-none transition-colors duration-150',
              'focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/25',
              confirmError
                ? 'border-red-500/60'
                : 'border-[var(--border-default)] hover:border-[var(--border-hover)]',
              isSubmitting ? 'cursor-not-allowed opacity-60' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowConfirmPassword((v) => !v)}
            aria-label={
              showConfirmPassword ? t('fields.hidePassword') : t('fields.showPassword')
            }
            className="absolute inset-y-0 end-0 flex items-center pe-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {confirmError && (
          <p id="reg-confirm-error" role="alert" className="text-xs text-red-400">
            {confirmError}
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
            {t('register.creatingAccount')}
          </span>
        ) : (
          t('register.submit')
        )}
      </button>

      {/* Login link */}
      <p className="text-center text-sm text-[var(--text-muted)]">
        {t('register.haveAccount')}{' '}
        <Link
          href={`/${locale}/login`}
          className="font-medium text-[var(--color-accent)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)]"
        >
          {t('register.signInLink')}
        </Link>
      </p>
    </form>
  );
}