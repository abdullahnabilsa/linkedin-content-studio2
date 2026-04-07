import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/auth/callback
 * ----------------------
 * Supabase Auth callback handler.
 *
 * After a user confirms their email (or completes OAuth) Supabase redirects
 * here with a `code` query parameter. We exchange it for a session and then
 * redirect to the correct destination:
 *
 *   - If an `invite` query param is present → /[locale]/invite/[code]
 *   - Otherwise → /[locale]/chat
 *
 * The locale is read from the `next` param (which the middleware writes) or
 * defaults to Arabic.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const code = searchParams.get('code');
  const inviteCode = searchParams.get('invite');
  // `next` is the locale-prefixed path the middleware preserved
  const next = searchParams.get('next') ?? '/ar/chat';

  // Determine locale from the `next` param or fallback to 'ar'
  const localeMatch = next.match(/^\/(ar|en)\//);
  const locale = localeMatch ? localeMatch[1] : 'ar';

  if (code) {
    const supabase = createServerClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Exchange succeeded — build redirect URL
      if (inviteCode) {
        return NextResponse.redirect(
          `${origin}/${locale}/invite/${inviteCode}`
        );
      }
      return NextResponse.redirect(`${origin}/${locale}/chat`);
    }

    // Exchange failed — send back to login with an error indicator
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=auth_callback_failed`
    );
  }

  // No code present — something went wrong upstream
  return NextResponse.redirect(`${origin}/${locale}/login?error=no_code`);
}