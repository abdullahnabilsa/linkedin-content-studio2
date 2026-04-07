import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient as createSupabaseServer } from '@supabase/ssr';

// ---------------------------------------------------------------------------
// Locale config (mirrors i18n/config.ts)
// ---------------------------------------------------------------------------
const locales = ['ar', 'en'] as const;
const defaultLocale = 'ar';

// next-intl middleware handles locale detection + prefix routing
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

// ---------------------------------------------------------------------------
// Route classification helpers
// ---------------------------------------------------------------------------

/** Routes that are completely public — no auth required */
const PUBLIC_PATHS = ['/', '/login', '/register'];

/** Routes that require a valid session */
const PROTECTED_PATHS = [
  '/chat',
  '/personas',
  '/library',
  '/calendar',
  '/settings',
  '/invite',
];

/** Routes that additionally require the admin role */
const ADMIN_PATHS = ['/admin'];

/**
 * Strip the locale prefix from a pathname so we can match
 * against the clean path segments above.
 * e.g. "/ar/chat/123" → "/chat/123"
 */
function stripLocale(pathname: string): string {
  for (const locale of locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || '/';
    }
  }
  return pathname;
}

function isPublicPath(cleanPath: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => cleanPath === p || cleanPath.startsWith(`${p}/`)
  );
}

function isProtectedPath(cleanPath: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => cleanPath === p || cleanPath.startsWith(`${p}/`)
  );
}

function isAdminPath(cleanPath: string): boolean {
  return ADMIN_PATHS.some(
    (p) => cleanPath === p || cleanPath.startsWith(`${p}/`)
  );
}

// ---------------------------------------------------------------------------
// Supabase session helpers
// ---------------------------------------------------------------------------

type SessionResult =
  | { authenticated: false; role: null }
  | { authenticated: true; role: string };

async function getSession(request: NextRequest): Promise<SessionResult> {
  // We need a response object to let the Supabase helper set cookies
  const response = NextResponse.next();

  const supabase = createSupabaseServer(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { authenticated: false, role: null };
  }

  // Fetch role from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_banned')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { authenticated: true, role: 'free' };
  }

  // Banned users are treated as unauthenticated so they are bounced to login
  if (profile.is_banned) {
    return { authenticated: false, role: null };
  }

  return { authenticated: true, role: profile.role as string };
}

// ---------------------------------------------------------------------------
// Main middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Step 1 — Run next-intl locale detection first.
  // This adds the locale prefix and sets the Accept-Language cookie.
  const intlResponse = intlMiddleware(request);

  // Determine the locale-stripped path for our auth logic
  const cleanPath = stripLocale(pathname);

  // Skip auth checks for Next.js internals and static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/icons') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/)
  ) {
    return intlResponse;
  }

  // Detect the current locale from the URL (falls back to default)
  const detectedLocale =
    locales.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    defaultLocale;

  // Helper: build a redirect URL with locale prefix
  function localePath(path: string, extra?: Record<string, string>): URL {
    const url = request.nextUrl.clone();
    url.pathname = `/${detectedLocale}${path}`;
    url.search = '';
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    return url;
  }

  // Step 2 — Check auth for protected / admin routes
  if (isProtectedPath(cleanPath) || isAdminPath(cleanPath)) {
    const session = await getSession(request);

    if (!session.authenticated) {
      // Preserve invite code query param if present so the user can
      // continue after logging in / registering
      const inviteCode = searchParams.get('code') ?? undefined;
      const extra: Record<string, string> = {};
      if (inviteCode) extra['code'] = inviteCode;

      // Also preserve the original destination so login can redirect back
      extra['next'] = pathname;

      return NextResponse.redirect(localePath('/login', extra));
    }

    // Step 3 — Admin-only gate
    if (isAdminPath(cleanPath) && session.role !== 'admin') {
      return NextResponse.redirect(localePath('/chat'));
    }

    // Authenticated — pass through (intl header already set)
    return intlResponse;
  }

  // Step 4 — Bounce already-authenticated users away from login/register
  if (cleanPath === '/login' || cleanPath === '/register') {
    const session = await getSession(request);
    if (session.authenticated) {
      return NextResponse.redirect(localePath('/chat'));
    }
  }

  return intlResponse;
}

export const config = {
  // Run middleware on every route except static files handled by the matcher
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};