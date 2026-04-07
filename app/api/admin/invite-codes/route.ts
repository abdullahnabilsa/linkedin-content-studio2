import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, data: null, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();

    const { data: codes, count, error } = await adminClient
      .from('invite_codes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    /* Fetch uses for each code */
    const codesWithUses = await Promise.all(
      (codes || []).map(async (code) => {
        const { data: uses } = await adminClient
          .from('invite_code_uses')
          .select('user_id, used_at')
          .eq('invite_code_id', code.id)
          .order('used_at', { ascending: false });

        /* Resolve user emails */
        const usesWithEmails = await Promise.all(
          (uses || []).map(async (use) => {
            const { data: userProfile } = await adminClient
              .from('profiles')
              .select('email')
              .eq('id', use.user_id)
              .single();
            return {
              user_email: userProfile?.email || 'Unknown',
              used_at: use.used_at,
            };
          })
        );

        /* Resolve creator email */
        const { data: creatorProfile } = await adminClient
          .from('profiles')
          .select('email')
          .eq('id', code.created_by)
          .single();

        return {
          ...code,
          creator_email: creatorProfile?.email || 'Unknown',
          uses: usesWithEmails,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { codes: codesWithUses, total: count || 0 },
      message: 'Invite codes fetched',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? message : undefined }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, data: null, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    let { code } = body;
    const { max_uses, duration_type, fixed_start_date, fixed_end_date, relative_days, expires_at } = body;

    /* Generate code if not provided */
    if (!code) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    code = code.toUpperCase().trim();

    if (!duration_type || !['fixed', 'relative'].includes(duration_type)) {
      return NextResponse.json({ success: false, data: null, message: 'Valid duration_type required (fixed or relative)' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    /* Check uniqueness */
    const { data: existing } = await adminClient
      .from('invite_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: false, data: null, message: 'Code already exists' }, { status: 409 });
    }

    const { data: newCode, error } = await adminClient
      .from('invite_codes')
      .insert({
        code,
        created_by: user.id,
        max_uses: max_uses || 1,
        duration_type,
        fixed_start_date: duration_type === 'fixed' ? fixed_start_date : null,
        fixed_end_date: duration_type === 'fixed' ? fixed_end_date : null,
        relative_days: duration_type === 'relative' ? (relative_days || 30) : null,
        is_active: true,
        expires_at: expires_at ? new Date(expires_at + 'T23:59:59Z').toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: newCode, message: 'Invite code created' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? message : undefined }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, data: null, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id, is_active, max_uses, expires_at } = body;
    if (!id) {
      return NextResponse.json({ success: false, data: null, message: 'Invite code ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const updateData: Record<string, unknown> = {};
    if (is_active !== undefined) updateData.is_active = is_active;
    if (max_uses !== undefined) updateData.max_uses = max_uses;
    if (expires_at !== undefined) updateData.expires_at = expires_at;

    const { data: updated, error } = await adminClient
      .from('invite_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated, message: 'Invite code updated' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? message : undefined }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, data: null, message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ success: false, data: null, message: 'Invite code ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    /* Delete uses first */
    await adminClient.from('invite_code_uses').delete().eq('invite_code_id', id);

    const { error } = await adminClient.from('invite_codes').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: null, message: 'Invite code deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? message : undefined }, { status: 500 });
  }
}