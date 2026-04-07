import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1), 10);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    const { data, error } = await supabase.from('post_library')
      .select('*')
      .eq('user_id', user.id)
      .not('scheduled_date', 'is', null)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [], message: 'OK' });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Failed to fetch calendar', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    const { postId, scheduled_date } = await request.json();
    if (!postId) return NextResponse.json({ success: false, data: null, message: 'Missing postId' }, { status: 400 });

    const { data, error } = await supabase.from('post_library')
      .update({ scheduled_date: scheduled_date || null, updated_at: new Date().toISOString() })
      .eq('id', postId).eq('user_id', user.id).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, data, message: 'Schedule updated' });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Failed to update schedule', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}