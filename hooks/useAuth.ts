'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase-client';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types/user';

/**
 * useAuth
 * -------
 * Primary auth hook for the application. Responsibilities:
 *
 *  1. Subscribe to Supabase onAuthStateChange and keep authStore in sync.
 *  2. Fetch the full profile row from `profiles` whenever the session changes.
 *  3. Detect banned users and sign them out immediately.
 *  4. Detect premium expiry on login and show a toast warning.
 *  5. Expose convenient booleans: isAdmin, isPremium, isFree, isSuperAdmin, isBanned.
 *  6. Provide signIn / signUp / signOut wrappers that update the store.
 *
 * Usage:
 *   const { user, isAdmin, signIn, signOut } = useAuth();
 */
export function useAuth() {
  const supabase = createBrowserClient();
  const router = useRouter();
  const locale = useLocale();

  // Zustand store accessors
  const {
    user,
    profile,
    isLoading,
    setUser,
    setProfile,
    setLoading,
    clearAuth,
    signIn: storeSignIn,
    signUp: storeSignUp,
    signOut: storeSignOut,
  } = useAuthStore();

  // Prevent duplicate profile fetches for the same user id
  const lastFetchedUserId = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch profile helper
  // ---------------------------------------------------------------------------
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      if (lastFetchedUserId.current === userId) {
        return profile;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('[useAuth] fetchProfile error:', error?.message);
        return null;
      }

      lastFetchedUserId.current = userId;
      return data as Profile;
    },
    // profile intentionally omitted to avoid stale closure issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase]
  );

  // ---------------------------------------------------------------------------
  // Premium expiry check
  // ---------------------------------------------------------------------------
  const checkPremiumExpiry = useCallback((fetchedProfile: Profile) => {
    if (
      fetchedProfile.role === 'premium' &&
      fetchedProfile.premium_expires_at
    ) {
      const expiry = new Date(fetchedProfile.premium_expires_at);
      const now = new Date();
      const daysLeft = Math.ceil(
        (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft <= 0) {
        // Already expired — show a warning toast
        toast.warning(
          locale === 'ar'
            ? 'انتهت صلاحية اشتراكك المميز. ستتم إعادتك إلى الخطة المجانية.'
            : 'Your premium subscription has expired. You have been reverted to the free plan.',
          { duration: 6000 }
        );
      } else if (daysLeft <= 7) {
        toast.info(
          locale === 'ar'
            ? `اشتراكك المميز ينتهي خلال ${daysLeft} أيام.`
            : `Your premium subscription expires in ${daysLeft} day(s).`,
          { duration: 5000 }
        );
      }
    }
  }, [locale]);

  // ---------------------------------------------------------------------------
  // Auth state subscription
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setLoading(true);

    // Get the initial session
    supabase.auth.getUser().then(async ({ data: { user: initialUser } }) => {
      if (initialUser) {
        setUser(initialUser);
        const fetchedProfile = await fetchProfile(initialUser.id);
        if (fetchedProfile) {
          if (fetchedProfile.is_banned) {
            // Banned on initial load — sign out silently
            await supabase.auth.signOut();
            clearAuth();
            router.replace(`/${locale}/login`);
            return;
          }
          setProfile(fetchedProfile);
          checkPremiumExpiry(fetchedProfile);
        }
      }
      setLoading(false);
    });

    // Listen for subsequent auth changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        clearAuth();
        setLoading(false);
        return;
      }

      const fetchedProfile = await fetchProfile(currentUser.id);

      if (fetchedProfile) {
        // Banned user detected after state change
        if (fetchedProfile.is_banned) {
          await supabase.auth.signOut();
          clearAuth();
          router.replace(`/${locale}/login`);
          return;
        }

        setProfile(fetchedProfile);

        // Only check expiry on fresh sign-in events
        if (event === 'SIGNED_IN') {
          checkPremiumExpiry(fetchedProfile);
        }
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  // We intentionally run this once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const role = profile?.role ?? 'free';
  const isAdmin = role === 'admin';
  const isPremium = role === 'premium' || role === 'admin';
  const isFree = role === 'free';
  const isSuperAdmin = profile?.is_super_admin ?? false;
  const isBanned = profile?.is_banned ?? false;

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        await storeSignIn(email, password);
        // Profile will be fetched by onAuthStateChange handler
      } finally {
        setLoading(false);
      }
    },
    [storeSignIn, setLoading]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        await storeSignUp(email, password);
      } finally {
        setLoading(false);
      }
    },
    [storeSignUp, setLoading]
  );

  const signOut = useCallback(async () => {
    await storeSignOut();
    clearAuth();
    lastFetchedUserId.current = null;
    router.push(`/${locale}/login`);
  }, [storeSignOut, clearAuth, router, locale]);

  return {
    // State
    user,
    profile,
    isLoading,
    // Role booleans
    role,
    isAdmin,
    isPremium,
    isFree,
    isSuperAdmin,
    isBanned,
    // Actions
    signIn,
    signUp,
    signOut,
  };
}