import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * GET /api/admin/users
 * List all users with pagination, search, filters, and sorting.
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

    /* Verify admin role */
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const sortField = searchParams.get('sortField') || 'created_at';
    const sortDirection = searchParams.get('sortDirection') || 'desc';

    const adminClient = createAdminClient();
    const offset = (page - 1) * limit;

    /* Build query */
    let query = adminClient
      .from('profiles')
      .select('*', { count: 'exact' });

    /* Filters */
    if (role !== 'all') {
      query = query.eq('role', role);
    }

    if (status === 'active') {
      query = query.eq('is_banned', false);
    } else if (status === 'banned') {
      query = query.eq('is_banned', true);
    }

    if (search.trim()) {
      query = query.or(
        `email.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`
      );
    }

    /* Validate sort field */
    const allowedSortFields = ['created_at', 'updated_at', 'email'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'created_at';
    const ascending = sortDirection === 'asc';

    query = query
      .order(safeSortField, { ascending })
      .range(offset, offset + limit - 1);

    const { data: users, count, error: usersError } = await query;

    if (usersError) {
      return NextResponse.json(
        { success: false, data: null, message: usersError.message },
        { status: 500 }
      );
    }

    /* Fetch conversation and message counts for each user */
    const usersWithCounts = await Promise.all(
      (users || []).map(async (u) => {
        const [convResult, msgResult] = await Promise.all([
          adminClient
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', u.id),
          adminClient
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'user')
            .in(
              'conversation_id',
              /* Subquery workaround: get conversation IDs first */
              (
                await adminClient
                  .from('conversations')
                  .select('id')
                  .eq('user_id', u.id)
              ).data?.map((c) => c.id) || []
            ),
        ]);

        return {
          ...u,
          conversation_count: convResult.count || 0,
          message_count: msgResult.count || 0,
        };
      })
    );

    /* Sort by message_count if requested (done in memory since it's a computed field) */
    if (sortField === 'message_count') {
      usersWithCounts.sort((a, b) => {
        const diff = a.message_count - b.message_count;
        return ascending ? diff : -diff;
      });
    }

    return NextResponse.json({
      success: true,
      data: { users: usersWithCounts, total: count || 0 },
      message: 'Users fetched successfully',
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

/**
 * PATCH /api/admin/users
 * Update user role, ban status, or premium expiration.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, data: null, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, role, is_banned, premium_expires_at, display_name } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, data: null, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    /* Check target user */
    const { data: targetUser, error: targetError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { success: false, data: null, message: 'User not found' },
        { status: 404 }
      );
    }

    /* Protect super admin */
    if (targetUser.is_super_admin) {
      return NextResponse.json(
        { success: false, data: null, message: 'Cannot modify super admin' },
        { status: 403 }
      );
    }

    /* Only super admin can change role to/from admin */
    if (role === 'admin' && !adminProfile.is_super_admin) {
      return NextResponse.json(
        { success: false, data: null, message: 'Only super admin can create admins' },
        { status: 403 }
      );
    }

    if (targetUser.role === 'admin' && role && role !== 'admin' && !adminProfile.is_super_admin) {
      return NextResponse.json(
        { success: false, data: null, message: 'Only super admin can downgrade admins' },
        { status: 403 }
      );
    }

    /* Build update object */
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (role !== undefined) {
      updateData.role = role;
    }

    if (is_banned !== undefined) {
      updateData.is_banned = is_banned;
    }

    if (premium_expires_at !== undefined) {
      updateData.premium_expires_at = premium_expires_at;
    }

    if (display_name !== undefined) {
      updateData.display_name = display_name;
    }

    /* When downgrading from premium, clear expiration */
    if (role === 'free') {
      updateData.premium_expires_at = null;
    }

    const { data: updatedUser, error: updateError } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, data: null, message: updateError.message },
        { status: 500 }
      );
    }

    /* Create notifications for role changes */
    if (role && role !== targetUser.role) {
      let notificationType = 'user_role_changed';
      let notificationTitle = 'User role changed';
      let notificationMessage = `User ${targetUser.email} role changed from ${targetUser.role} to ${role}`;

      if (role === 'premium') {
        notificationType = 'premium_upgraded';
        notificationTitle = 'User upgraded to Premium';
        notificationMessage = `User ${targetUser.email} has been upgraded to Premium`;
      } else if (targetUser.role === 'premium' && role === 'free') {
        notificationType = 'premium_downgraded';
        notificationTitle = 'User downgraded to Free';
        notificationMessage = `User ${targetUser.email} has been downgraded to Free`;
      }

      await adminClient.from('notifications').insert({
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        priority: 'normal',
        related_user_id: id,
      });
    }

    /* Notification for ban/unban */
    if (is_banned !== undefined && is_banned !== targetUser.is_banned) {
      await adminClient.from('notifications').insert({
        type: is_banned ? 'user_banned' : 'user_unbanned',
        title: is_banned ? 'User banned' : 'User unbanned',
        message: `User ${targetUser.email} has been ${is_banned ? 'banned' : 'unbanned'}`,
        priority: is_banned ? 'urgent' : 'normal',
        related_user_id: id,
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
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

/**
 * DELETE /api/admin/users
 * Delete a user and all associated data.
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, data: null, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, data: null, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    /* Check target user */
    const { data: targetUser, error: targetError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { success: false, data: null, message: 'User not found' },
        { status: 404 }
      );
    }

    /* Cannot delete super admin */
    if (targetUser.is_super_admin) {
      return NextResponse.json(
        { success: false, data: null, message: 'Cannot delete super admin' },
        { status: 403 }
      );
    }

    /* Cannot delete self */
    if (id === user.id) {
      return NextResponse.json(
        { success: false, data: null, message: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    /* Delete the profile (cascade will handle related data) */
    const { error: deleteError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, data: null, message: deleteError.message },
        { status: 500 }
      );
    }

    /* Also delete from auth.users using admin API */
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(id);

    if (authDeleteError) {
      /* Log but don't fail — profile is already deleted */
      console.error('Failed to delete auth user:', authDeleteError.message);
    }

    /* Create notification */
    await adminClient.from('notifications').insert({
      type: 'user_deleted',
      title: 'User deleted',
      message: `User ${targetUser.email} has been permanently deleted`,
      priority: 'urgent',
    });

    return NextResponse.json({
      success: true,
      data: null,
      message: 'User deleted successfully',
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