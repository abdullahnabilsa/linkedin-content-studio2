'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, Gift, CalendarDays, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { createBrowserClient } from '@/lib/supabase-client';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Logo } from '@/components/common/Logo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InviteCodeRow {
  id: string;
  code: string;
  is_active: boolean;
  max_uses: number;
  current_uses: number;
  duration_type: 'fixed' | 'relative';
  fixed_start_date: string | null;
  fixed_end_date: string | null;
  relative_days: number | null;
  expires_at: string | null;
}

type PageStatus =
  | 'loading'       // initial state — checking session + code validity
  | 'ready'         // code is valid, user can activate
  | 'activating'    // user clicked Activate
  | 'success'       // successfully activated
  | 'already_used'  // user already activated this code
  | 'already_premium' // user is already premium/admin
  | 'code_invalid'  // code does not exist or is inactive
  | 'code_expired'  // expires_at has passed
  | 'code_exhausted'// all uses consumed
  | 'error';        // unexpected error

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute the premium expiry date from a code row */
function computeExpiryDate(code: InviteCodeRow): Date {
  if (code.duration_type === 'fixed' && code.fixed_end_date) {
    return new Date(code.fixed_end_date);
  }
  // Relative — add relative_days to today
  const d = new Date();
  d.setDate(d.getDate() + (code.relative_days ?? 30));
  return d;
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function InviteCodePage({
  params,
}: {
  params: { code: string; locale: string };
}) {
  const t = useTranslations('invite');
  const locale = useLocale();
  const router = useRouter();
  const supabase = createBrowserClient();

  const { user, profile } = useAuthStore();

  const [status, setStatus] = useState<PageStatus>('loading');
  const [inviteCode, setInviteCode] = useState<InviteCodeRow | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ---------------------------------------------------------------------------
  // Initial validation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function validateCode() {
      // Auth guard — redirect if no session
      if (!user) {
        router.replace(`/${locale}/login?code=${params.code}`);
        return;
      }

      // Step 1: Check code exists and is active
      const { data: codeRow, error: codeError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', params.code)
        .single();

      if (codeError || !codeRow) {
        setStatus('code_invalid');
        return;
      }

      const code = codeRow as InviteCodeRow;

      if (!code.is_active) {
        setStatus('code_invalid');
        return;
      }

      // Step 2: Check expiry
      if (code.expires_at && new Date(code.expires_at) < new Date()) {
        setStatus('code_expired');
        return;
      }

      // Step 3: Check remaining uses
      if (code.current_uses >= code.max_uses) {
        setStatus('code_exhausted');
        return;
      }

      // Step 4: Check if this user already used this code
      const { data: usageRow } = await supabase
        .from('invite_code_uses')
        .select('id')
        .eq('invite_code_id', code.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (usageRow) {
        setStatus('already_used');
        return;
      }

      // Step 5: Check user is not already premium/admin
      if (profile?.role === 'premium' || profile?.role === 'admin') {
        setStatus('already_premium');
        return;
      }

      // All checks passed
      setInviteCode(code);
      setExpiryDate(computeExpiryDate(code));
      setStatus('ready');
    }

    validateCode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ---------------------------------------------------------------------------
  // Activation handler
  // ---------------------------------------------------------------------------
  const handleActivate = useCallback(async () => {
    if (!inviteCode || !user || !expiryDate) return;

    setStatus('activating');

    try {
      // 1. Update user role and premium_expires_at
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          role: 'premium',
          premium_expires_at: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Increment current_uses on invite_codes
      const { error: usesError } = await supabase
        .from('invite_codes')
        .update({ current_uses: inviteCode.current_uses + 1 })
        .eq('id', inviteCode.id);

      if (usesError) throw usesError;

      // 3. Record usage
      const { error: usageError } = await supabase
        .from('invite_code_uses')
        .insert({ invite_code_id: inviteCode.id, user_id: user.id });

      if (usageError) throw usageError;

      // 4. Create internal notification for admin (best-effort — don't fail if it errors)
      await supabase.from('notifications').insert({
        type: 'invite_activated',
 'Invite Code Activated',
        message: `User ${profile?.email ?? user.id} activated invite code: ${inviteCode.code}. Premium until ${expiryDate.toISOString()}.`,
        priority: 'info',
        related_user_id: user.id,
        metadata: {
          code: inviteCode.code,
          premium_until: expiryDate.toISOString(),
        },
      });

      // 5. Fire Telegram notification via internal webhook (best-effort)
      try {
        await fetch('/api/webhook/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'invite_activated',
            message: `User: ${profile?.email ?? user.id}
Code: ${inviteCode.code}
Premium until: ${expiryDate.toISOString()}`,
            priority: 'info',
          }),
        });
      } catch {
        // Telegram failure must never block the user
      }

      setStatus('success');
    } catch (err: unknown) {
      console.error('[InvitePage] activation error:', err);
      const message = err instanceof Error ? err.message : t('errors.unknown');
      setErrorMsg(message);
      setStatus('error');
    }
  }, [inviteCode, user, expiryDate, profile, supabase, t]);

  // ---------------------------------------------------------------------------
  // Render states
  // ---------------------------------------------------------------------------

  if (status === 'loading' || status === 'activating') {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 py-8">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-[var(--text-muted)]">
            {status === 'activating' ? t('activating') : t('validating')}
          </p>
        </div>
      </PageShell>
    );
  }

  if (status === 'success' && expiryDate) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <CheckCircle2
            className="h-16 w-16 text-[var(--color-accent)]"
            aria-hidden="true"
          />
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            {t('success.heading')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {t('success.body', { date: formatDate(expiryDate, locale) })}
          </p>
          <button
            onClick={() => router.push(`/${locale}/chat`)}
            className="
              mt-2 h-12 w-full max-w-xs rounded-lg
              bg-[var(--color-accent)] text-[var(--color-accent-foreground)]
              text-sm font-semibold
              hover:brightness-110 active:scale-[0.98]
              transition-all duration-150
            "
          >
            {t('success.cta')}
          </button>
        </div>
      </PageShell>
    );
  }

  // Error / invalid states
  const errorStates: Record<string, { icon: React.ElementType; message: string }> = {
    code_invalid: { icon: XCircle, message: t('errors.codeInvalid') },
    code_expired: { icon: XCircle, message: t('errors.codeExpired') },
    code_exhausted: { icon: XCircle, message: t('errors.codeExhausted') },
    already_used: { icon: AlertCircle, message: t('errors.alreadyUsed') },
    already_premium: { icon: AlertCircle, message: t('errors.alreadyPremium') },
    error: { icon: XCircle, message: errorMsg || t('errors.unknown') },
  };

  if (status in errorStates) {
    const { icon: Icon, message } = errorStates[status];
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <Icon className="h-14 w-14 text-red-400" aria-hidden="true" />
          <p className="text-sm text-[var(--text-secondary)]">{message}</p>
          <button
            onClick={() => router.push(`/${locale}/chat`)}
            className="
              mt-2 h-10 rounded-lg border border-[var(--border-default)]
              px-6 text-sm text-[var(--text-secondary)]
              hover:bg-[var(--bg-hover)] transition-colors duration-150
            "
          >
            {t('errors.goHome')}
          </button>
        </div>
      </PageShell>
    );
  }

  // status === 'ready'
  return (
    <PageShell>
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <Gift
          className="h-14 w-14 text-[var(--color-accent)]"
          aria-hidden="true"
        />
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          {t('ready.heading')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {t('ready.body')}
        </p>

        {/* Duration info */}
        {expiryDate && (
          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)]/10 px-4 py-2 text-sm text-[var(--color-accent)]">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t('ready.premiumUntil', { date: formatDate(expiryDate, locale) })}
            </span>
          </div>
        )}

        {/* Activate button */}
        <button
          onClick={handleActivate}
          className="
            mt-2 h-12 w-full max-w-xs rounded-lg
            bg-[var(--color-accent)] text-[var(--color-accent-foreground)]
            text-sm font-semibold
            hover:brightness-110 active:scale-[0.98]
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2
          "
        >
          {t('ready.activate')}
        </button>

        <button
          onClick={() => router.push(`/${locale}/chat`)}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {t('ready.skipForNow')}
        </button>
      </div>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Shared page shell (logo + card)
// ---------------------------------------------------------------------------
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-4 py-12">
      <div className="mb-8">
        <Logo size="lg" />
      </div>
      <div
        className="
          w-full max-w-[420px] rounded-2xl
          bg-[var(--bg-elevated)] shadow-[var(--shadow-elevation-2)]
          border border-[var(--border-default)]
          px-6 py-8 sm:px-8
        "
      >
        {children}
      </div>
    </main>
  );
}