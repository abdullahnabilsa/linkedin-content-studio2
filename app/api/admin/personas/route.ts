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
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    let query = adminClient
      .from('personas')
      .select('*')
      .in('type', ['basic', 'premium'])
      .order('sort_order', { ascending: true });

    if (typeFilter && (typeFilter === 'basic' || typeFilter === 'premium')) {
      query = query.eq('type', typeFilter);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,name_en.ilike.%${search}%`);
    }

    const { data: personas, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: personas || [], message: 'Personas fetched' });
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
    const { name, name_en, description, description_en, system_prompt, icon_url, category_id, type, slash_command, sort_order } = body;

    if (!name || !description || !system_prompt) {
      return NextResponse.json({ success: false, data: null, message: 'Name, description, and system prompt are required' }, { status: 400 });
    }
    if (type !== 'basic' && type !== 'premium') {
      return NextResponse.json({ success: false, data: null, message: 'Type must be basic or premium' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: persona, error } = await adminClient
      .from('personas')
      .insert({
        user_id: null,
        name,
        name_en: name_en || null,
        description,
        description_en: description_en || null,
        system_prompt,
        icon_url: icon_url || null,
        category_id: category_id || null,
        type,
        is_active: true,
        slash_command: slash_command || null,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: persona, message: 'Persona created' });
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
    const { id, ...updateFields } = body;
    if (!id) {
      return NextResponse.json({ success: false, data: null, message: 'Persona ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const allowedFields = ['name', 'name_en', 'description', 'description_en', 'system_prompt', 'icon_url', 'category_id', 'type', 'is_active', 'slash_command', 'sort_order'];
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (updateFields[key] !== undefined) {
        updateData[key] = updateFields[key];
      }
    }

    const { data: updated, error } = await adminClient
      .from('personas')
      .update(updateData)
      .eq('id', id)
      .in('type', ['basic', 'premium'])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated, message: 'Persona updated' });
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
      return NextResponse.json({ success: false, data: null, message: 'Persona ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('personas')
      .delete()
      .eq('id', id)
      .in('type', ['basic', 'premium']);

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: null, message: 'Persona deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? message : undefined }, { status: 500 });
  }
}