import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * GET /api/admin/stats
 * Returns dashboard statistics for the admin panel.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, data: null, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const adminClient = createAdminClient();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekISO = lastWeek.toISOString();

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoISO = twoWeeksAgo.toISOString();

    /* Run all queries in parallel for efficiency */
    const [
      totalUsersResult,
      premiumUsersResult,
      activeTodayResult,
      totalPostsResult,
      totalConversationsResult,
      messagesTodayResult,
      topPersonasResult,
      recentUsersResult,
      recentNotificationsResult,
      usersThisWeekResult,
      usersLastWeekResult,
    ] = await Promise.all([
      /* Total users */
      adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true }),

      /* Premium users */
      adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'premium'),

      /* Active today (users with updated_at today) */
      adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', todayISO),

      /* Total posts in library */
      adminClient
        .from('post_library')
        .select('*', { count: 'exact', head: true }),

      /* Total conversations */
      adminClient
        .from('conversations')
        .select('*', { count: 'exact', head: true }),

      /* Messages today */
      adminClient
        .from('messages')
        .select('tokens_used')
        .gte('created_at', todayISO),

      /* Top personas by usage_count */
      adminClient
        .from('personas')
        .select('name, usage_count')
        .order('usage_count', { ascending: false })
        .limit(10),

      /* Recent users */
      adminClient
        .from('profiles')
        .select('email, display_name, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5),

      /* Recent notifications */
      adminClient
        .from('notifications')
        .select('id, type, title, message, priority, created_at, is_read')
        .order('created_at', { ascending: false })
        .limit(5),

      /* Users this week (for growth calculation) */
      adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastWeekISO),

      /* Users last week */
      adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgoISO)
        .lt('created_at', lastWeekISO),
    ]);

    const totalUsers = totalUsersResult.count || 0;
    const premiumUsers = premiumUsersResult.count || 0;
    const activeToday = activeTodayResult.count || 0;
    const totalPosts = totalPostsResult.count || 0;
    const totalConversations = totalConversationsResult.count || 0;

    /* Calculate messages and tokens today */
    const todayMessages = messagesTodayResult.data || [];
    const messagesToday = todayMessages.length;
    const tokensToday = todayMessages.reduce(
      (sum, msg) => sum + (msg.tokens_used || 0),
      0
    );

    /* Calculate growth percentage */
    const usersThisWeek = usersThisWeekResult.count || 0;
    const usersLastWeek = usersLastWeekResult.count || 0;
    let userGrowthPercent = 0;
    if (usersLastWeek > 0) {
      userGrowthPercent = Math.round(
        ((usersThisWeek - usersLastWeek) / usersLastWeek) * 100
      );
    } else if (usersThisWeek > 0) {
      userGrowthPercent = 100;
    }

    /* Premium percentage of total */
    const premiumPercent = totalUsers > 0
      ? Math.round((premiumUsers / totalUsers) * 100)
      : 0;

    const stats = {
      totalUsers,
      premiumUsers,
      activeToday,
      totalPosts,
      totalConversations,
      messagesToday,
      tokensToday,
      topPersonas: topPersonasResult.data || [],
      recentUsers: recentUsersResult.data || [],
      recentNotifications: recentNotificationsResult.data || [],
      userGrowthPercent,
      premiumPercent,
    };

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Stats fetched successfully',
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
      { status: 500 }
    );
  }
}