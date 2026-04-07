import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/personas
 * Fetch personas available to the current user.
 * Query params: type (basic|premium|custom), categoryId, search
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, data: null, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');

    /* Fetch user profile to check role */
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    const personas: Record<string, unknown>[] = [];

    /* ── Fetch basic + premium personas ────────────── */
    if (!typeFilter || typeFilter === 'basic' || typeFilter === 'premium') {
      let publicQuery = supabase
        .from('personas')
        .select('*')
        .in('type', typeFilter ? [typeFilter] : ['basic', 'premium'])
        .order('sort_order', { ascending: true });

      /* Admin sees all, others see only active */
      if (!isAdmin) {
        publicQuery = publicQuery.eq('is_active', true);
      }

      if (categoryId) {
        publicQuery = publicQuery.eq('category_id', categoryId);
      }

      if (search) {
        publicQuery = publicQuery.or(
          `name.ilike.%${search}%,name_en.ilike.%${search}%,description.ilike.%${search}%`,
        );
      }

      const { data: publicData, error: pubErr } = await publicQuery;
      if (pubErr) {
        return NextResponse.json(
          { success: false, data: null, message: 'Failed to fetch personas' },
          { status: 500 },
        );
      }

      if (publicData) {
        personas.push(...publicData);
      }
    }

    /* ── Fetch user's custom personas ──────────────── */
    if (!typeFilter || typeFilter === 'custom') {
      let customQuery = supabase
        .from('personas')
        .select('*')
        .eq('type', 'custom')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (categoryId) {
        customQuery = customQuery.eq('category_id', categoryId);
      }

      if (search) {
        customQuery = customQuery.or(
          `name.ilike.%${search}%,description.ilike.%${search}%`,
        );
      }

      const { data: customData, error: custErr } = await customQuery;
      if (custErr) {
        return NextResponse.json(
          { success: false, data: null, message: 'Failed to fetch custom personas' },
          { status: 500 },
        );
      }

      if (customData) {
        personas.push(...customData);
      }
    }

    return NextResponse.json({
      success: true,
      data: personas,
      message: 'Personas fetched successfully',
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

/**
 * POST /api/personas
 * Create a new custom persona for the current user.
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
    const { name, description, system_prompt, category_id, icon_url } = body;

    /* ── Validate required fields ──────────────────── */
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, data: null, message: 'Name is required' },
        { status: 400 },
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { success: false, data: null, message: 'Description is required' },
        { status: 400 },
      );
    }

    if (!system_prompt?.trim()) {
      return NextResponse.json(
        { success: false, data: null, message: 'System prompt is required' },
        { status: 400 },
      );
    }

    if (system_prompt.length > 4000) {
      return NextResponse.json(
        { success: false, data: null, message: 'System prompt exceeds 4000 characters' },
        { status: 400 },
      );
    }

    /* ── Check user role and enforce limits ─────────── */
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role ?? 'free';

    if (userRole === 'free') {
      /* Fetch the limit from system_config */
      let maxCustomFree = 3;
      const { data: configData } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'max_custom_personas_free')
        .single();

      if (configData?.value) {
        maxCustomFree = parseInt(configData.value, 10) || 3;
      }

      /* Count existing custom personas */
      const { count, error: countErr } = await supabase
        .from('personas')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('type', 'custom');

      if (countErr) {
        return NextResponse.json(
          { success: false, data: null, message: 'Failed to check persona count' },
          { status: 500 },
        );
      }

      if ((count ?? 0) >= maxCustomFree) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            message: `Custom persona limit reached (${maxCustomFree}). Upgrade to premium for unlimited personas.`,
          },
          { status: 403 },
        );
      }
    }

    /* ── Insert the persona ────────────────────────── */
    const insertData: Record<string, unknown> = {
      user_id: user.id,
      name: name.trim(),
      description: description.trim(),
      system_prompt: system_prompt.trim(),
      type: 'custom',
      is_active: true,
    };

    if (category_id) {
      insertData.category_id = category_id;
    }

    if (icon_url) {
      insertData.icon_url = icon_url;
    }

    const { data: created, error: insertErr } = await supabase
      .from('personas')
      .insert(insertData)
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Failed to create persona',
          error: process.env.NODE_ENV === 'development' ? insertErr.message : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: created,
      message: 'Persona created successfully',
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

/**
 * PATCH /api/personas
 * Update an existing custom persona (users can only update their own).
 */
export async function PATCH(request: NextRequest) {
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
    const { id, name, description, system_prompt, category_id, icon_url } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, data: null, message: 'Persona ID is required' },
        { status: 400 },
      );
    }

    /* ── Verify ownership ──────────────────────────── */
    const { data: existingPersona, error: fetchErr } = await supabase
      .from('personas')
      .select('id, user_id, type')
      .eq('id', id)
      .single();

    if (fetchErr || !existingPersona) {
      return NextResponse.json(
        { success: false, data: null, message: 'Persona not found' },
        { status: 404 },
      );
    }

    /* Users can only edit their own custom personas */
    if (existingPersona.type !== 'custom' || existingPersona.user_id !== user.id) {
      /* Check if admin */
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { success: false, data: null, message: 'You can only edit your own custom personas' },
          { status: 403 },
        );
      }
    }

    /* ── Build update object ───────────────────────── */
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { success: false, data: null, message: 'Name cannot be empty' },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return NextResponse.json(
          { success: false, data: null, message: 'Description cannot be empty' },
          { status: 400 },
        );
      }
      updateData.description = description.trim();
    }

    if (system_prompt !== undefined) {
      if (!system_prompt.trim()) {
        return NextResponse.json(
          { success: false, data: null, message: 'System prompt cannot be empty' },
          { status: 400 },
        );
      }
      if (system_prompt.length > 4000) {
        return NextResponse.json(
          { success: false, data: null, message: 'System prompt exceeds 4000 characters' },
          { status: 400 },
        );
      }
      updateData.system_prompt = system_prompt.trim();
    }

    if (category_id !== undefined) {
      updateData.category_id = category_id;
    }

    if (icon_url !== undefined) {
      updateData.icon_url = icon_url;
    }

    const { data: updated, error: updateErr } = await supabase
      .from('personas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Failed to update persona',
          error: process.env.NODE_ENV === 'development' ? updateErr.message : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Persona updated successfully',
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

/**
 * DELETE /api/personas
 * Delete a custom persona (users can only delete their own).
 */
export async function DELETE(request: NextRequest) {
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
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, data: null, message: 'Persona ID is required' },
        { status: 400 },
      );
    }

    /* ── Verify ownership ──────────────────────────── */
    const { data: existingPersona, error: fetchErr } = await supabase
      .from('personas')
      .select('id, user_id, type')
      .eq('id', id)
      .single();

    if (fetchErr || !existingPersona) {
      return NextResponse.json(
        { success: false, data: null, message: 'Persona not found' },
        { status: 404 },
      );
    }

    /* Users can only delete their own custom personas */
    if (existingPersona.type !== 'custom' || existingPersona.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { success: false, data: null, message: 'You can only delete your own custom personas' },
          { status: 403 },
        );
      }
    }

    /* ── Delete the persona ────────────────────────── */
    const { error: deleteErr } = await supabase
      .from('personas')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: 'Failed to delete persona',
          error: process.env.NODE_ENV === 'development' ? deleteErr.message : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Persona deleted successfully',
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