import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase.from('post_library').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [], message: 'OK' });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Failed to fetch library', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    /* Check limits for non-premium */
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'free') {
      const { count } = await supabase.from('post_library').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      const { data: configRow } = await supabase.from('system_config').select('value').eq('key', 'max_saved_posts_free').single();
      const maxPosts = configRow?.value ? parseInt(configRow.value, 10) : 20;
      if ((count ?? 0) >= maxPosts) {
        return NextResponse.json({ success: false, data: null, message: `Post library limit reached (${maxPosts}). Upgrade to Premium for unlimited.` }, { status: 403 });
      }
    }

    const body = await request.json();
    const { data, error } = await supabase.from('post_library').insert({ ...body, user_id: user.id }).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, data, message: 'Post saved to library' });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Failed to save post', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ success: false, data: null, message: 'Missing post id' }, { status: 400 });

    const { data, error } = await supabase.from('post_library')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).eq('user_id', user.id).select().single();
    if (error) throw error;

    return NextResponse.json({ success: true, data, message: 'Post updated' });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Failed to update post', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ success: false, data: null, message: 'Missing post id' }, { status: 400 });

    const { error } = await supabase.from('post_library').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;

    return NextResponse.json({ success: true, data: null, message: 'Post deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Failed to delete post', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}