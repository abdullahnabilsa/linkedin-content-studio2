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
    const typeFilter = searchParams.get('type') || 'all';
    const priorityFilter = searchParams.get('priority') || 'all';
    const readFilter = searchParams.get('read') || 'all';
    const offset = (page - 1) * limit;

    const adminClient = createAdminClient();
    let query = adminClient
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }
    if (priorityFilter !== 'all') {
      query = query.eq('priority', priorityFilter);
    }
    if (readFilter === 'unread') {
      query = query.eq('is_read', false);
    } else if (readFilter === 'read') {
      query = query.eq('is_read', true);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: notifications, count, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { notifications: notifications || [], total: count || 0 },
      message: 'Notifications fetched',
    });
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
    const adminClient = createAdminClient();

    if (body.markAllRead) {
      const { error } = await adminClient
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false);
      if (error) {
        return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: null, message: 'All marked as read' });
    }

    if (body.ids && Array.isArray(body.ids)) {
      const { error } = await adminClient
        .from('notifications')
        .update({ is_read: true })
        .in('id', body.ids);
      if (error) {
        return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: null, message: 'Notifications marked as read' });
    }

    if (body.id) {
      const { error } = await adminClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', body.id);
      if (error) {
        return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: null, message: 'Notification marked as read' });
    }

    return NextResponse.json({ success: false, data: null, message: 'No valid action provided' }, { status: 400 });
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
    const adminClient = createAdminClient();

    if (body.olderThan === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { error } = await adminClient
        .from('notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());
      if (error) {
        return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: null, message: 'Old notifications deleted' });
    }

    if (body.id) {
      const { error } = await adminClient
        .from('notifications')
        .delete()
        .eq('id', body.id);
      if (error) {
        return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: null, message: 'Notification deleted' });
    }

    return NextResponse.json({ success: false, data: null, message: 'No valid action provided' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? message : undefined }, { status: 500 });
  }
}