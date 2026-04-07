'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/authStore';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface RouteGuardProps {
  children: React.ReactNode;
  /**
   * 'any'     — only requires a valid session
   * 'premium' — requires premium or admin role
   * 'admin'   — requires admin role
   */
  requiredRole?: 'admin' | 'premium' | 'any';
}

/**
 * Client-side route protection layer.
 *
 * The middleware already handles server-side redirects, but the RouteGuard
 * adds a second safety net that prevents any flash of protected content while
 * the client hydrates. It renders a full-screen spinner until the auth state
 * is confirmed, then either shows children or redirects.
 */
export function RouteGuard({
  children,
  requiredRole = 'any',
}: RouteGuardProps) {
  const router = useRouter();
  const locale = useLocale();

  // Read auth state from the global Zustand store (populated by useAuth)
  const { user, profile, isLoading } = useAuthStore();

  // Track whether we have already decided to redirect so we do not
  // render children for even a single frame while the push is pending.
  const redirecting = useRef(false);

  useEffect(() => {
    // Still loading — wait for the auth store to hydrate
    if (isLoading) return;

    // No user → send to login
    if (!user) {
      redirecting.current = true;
      router.replace(`/${locale}/login`);
      return;
    }

    // Banned users are blocked even if a session cookie exists
    if (profile?.is_banned) {
      redirecting.current = true;
      router.replace(`/${locale}/login`);
      return;
    }

    const role = profile?.role ?? 'free';

    if (requiredRole === 'admin' && role !== 'admin') {
      redirecting.current = true;
      router.replace(`/${locale}/chat`);
      return;
    }

    if (requiredRole === 'premium' && role === 'free') {
      redirecting.current = true;
      router.replace(`/${locale}/chat`);
      return;
    }

    redirecting.current = false;
  }, [user, profile, isLoading, requiredRole, router, locale]);

  // Show a full-page spinner while:
  //   a) auth state is loading, OR
  //   b) we are about to redirect (prevents content flash)
  if (isLoading || redirecting.current || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--bg-primary)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}