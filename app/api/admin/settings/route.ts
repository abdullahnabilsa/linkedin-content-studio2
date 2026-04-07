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

    const adminClient = createAdminClient();
    const { data: configs, error } = await adminClient
      .from('system_config')
      .select('key, value, value_type, description')
      .order('key', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: configs || [], message: 'Settings fetched' });
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
    const { settings } = body;

    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      return NextResponse.json({ success: false, data: null, message: 'Settings array is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    for (const setting of settings) {
      const { key, value } = setting;
      if (!key || value === undefined) continue;

      /* Determine value_type */
      let valueType = 'string';
      if (/^\d+$/.test(value)) valueType = 'integer';
      if (value === 'true' || value === 'false') valueType = 'boolean';

      /* Upsert: insert if not exists, update if exists */
      const { data: existing } = await adminClient
        .from('system_config')
        .select('id')
        .eq('key', key)
        .maybeSingle();

      if (existing) {
        await adminClient
          .from('system_config')
          .update({
            value: String(value),
            value_type: valueType,
            updated_at: now,
            updated_by: user.id,
          })
          .eq('key', key);
      } else {
        await adminClient
          .from('system_config')
          .insert({
            key,
            value: String(value),
            value_type: valueType,
            description: null,
            updated_at: now,
            updated_by: user.id,
          });
      }
    }

    return NextResponse.json({ success: true, data: null, message: 'Settings updated successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? message : undefined }, { status: 500 });
  }
}