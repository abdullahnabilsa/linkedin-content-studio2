import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * POST /api/persona-trial
 * Check and record a premium persona trial for a free user.
 *
 * Body: { personaId: string }
 *
 * Logic:
 * 1. Premium/admin users always get canUse: true (no tracking needed).
 * 2. Free users:
 *    a. Has this user used THIS persona TODAY? → already_tried
 *    b. Has the user hit the daily persona trial limit? → daily_limit
 *    c. Otherwise: insert a usage record and return canUse: true
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { personaId } = body;

    if (!personaId) {
      return NextResponse.json(
        { success: false, data: null, message: 'personaId is required' },
        { status: 400 },
      );
    }

    /* ── Check user role ───────────────────────────── */
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json(
        { success: false, data: null, message: 'Profile not found' },
        { status: 404 },
      );
    }

    /* Premium and admin users always have access */
    if (profile.role === 'admin' || profile.role === 'premium') {
      return NextResponse.json({
        success: true,
        data: {
          canUse: true,
          remainingToday: Infinity,
          reason: null,
        },
        message: 'Premium/admin access granted',
      });
    }

    /* ── Verify the persona exists and is premium ──── */
    const { data: persona, error: personaErr } = await supabase
      .from('personas')
      .select('id, type, is_active')
      .eq('id', personaId)
      .single();

    if (personaErr || !persona) {
      return NextResponse.json(
        { success: false, data: null, message: 'Persona not found' },
        { status: 404 },
      );
    }

    if (persona.type !== 'premium') {
      /* Non-premium personas don't need trial tracking */
      return NextResponse.json({
        success: true,
        data: {
          canUse: true,
          remainingToday: Infinity,
          reason: null,
        },
        message: 'Non-premium persona, access granted',
      });
    }

    if (!persona.is_active) {
      return NextResponse.json({
        success: false,
        data: { canUse: false, remainingToday: 0, reason: 'inactive' },
        message: 'This persona is currently inactive',
      });
    }

    /* ── Get system config for max daily trials ────── */
    let maxTrialsPerDay = 5;
    const { data: configData } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'max_premium_trials_per_day')
      .single();

    if (configData?.value) {
      maxTrialsPerDay = parseInt(configData.value, 10) || 5;
    }

    const today = new Date().toISOString().split('T')[0];

    /* ── Check if user already tried THIS persona today ─ */
    const { data: existingTrial } = await supabase
      .from('premium_persona_daily_usage')
      .select('id')
      .eq('user_id', user.id)
      .eq('persona_id', personaId)
      .eq('usage_date', today)
      .maybeSingle();

    if (existingTrial) {
      /* Already tried this specific persona today */
      /* Count total distinct trials for today */
      const { count: totalTrials } = await supabase
        .from('premium_persona_daily_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('usage_date', today);

      return NextResponse.json({
        success: true,
        data: {
          canUse: false,
          remainingToday: Math.max(0, maxTrialsPerDay - (totalTrials ?? 0)),
          reason: 'already_tried',
        },
        message: 'Already tried this persona today',
      });
    }

    /* ── Check daily persona trial limit ───────────── */
    const { count: todayCount, error: countErr } = await supabase
      .from('premium_persona_daily_usage')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('usage_date', today);

    if (countErr) {
      return NextResponse.json(
        { success: false, data: null, message: 'Failed to check daily usage' },
        { status: 500 },
      );
    }

    const currentCount = todayCount ?? 0;

    if (currentCount >= maxTrialsPerDay) {
      return NextResponse.json({
        success: true,
        data: {
          canUse: false,
          remainingToday: 0,
          reason: 'daily_limit',
        },
        message: `Daily premium persona trial limit reached (${maxTrialsPerDay})`,
      });
    }

    /* ── Record the trial usage ────────────────────── */
    const { error: insertErr } = await supabase
      .from('premium_persona_daily_usage')
      .insert({
        user_id: user.id,
        persona_id: personaId,
        usage_date: today,
      });

    if (insertErr) {
      /* Handle unique constraint violation (race condition) */
      if (insertErr.code === '23505') {
        return NextResponse.json({
          success: true,
          data: {
            canUse: false,
            remainingToday: Math.max(0, maxTrialsPerDay - currentCount),
            reason: 'already_tried',
          },
          message: 'Already tried this persona today',
        });
      }

      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Failed to record trial usage',
          error: process.env.NODE_ENV === 'development' ? insertErr.message : undefined,
        },
        { status: 500 },
      );
    }

    const remaining = maxTrialsPerDay - currentCount - 1;

    return NextResponse.json({
      success: true,
      data: {
        canUse: true,
        remainingToday: Math.max(0, remaining),
        reason: null,
      },
      message: 'Premium persona trial granted',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? message : undefined,
      },
      { status: 500 },
    );
  }
}