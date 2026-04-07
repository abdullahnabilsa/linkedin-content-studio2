import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * GET /api/admin/models
 * List all models grouped by their parent API key.
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

    /* Get all global API keys */
    const { data: apiKeys, error: keysError } = await adminClient
      .from('api_keys')
      .select('id, platform, label, is_active')
      .eq('is_global', true)
      .order('created_at', { ascending: false });

    if (keysError) {
      return NextResponse.json(
        { success: false, data: null, message: keysError.message },
        { status: 500 }
      );
    }

    /* Get all global models */
    const { data: allModels, error: modelsError } = await adminClient
      .from('global_models')
      .select('*')
      .order('sort_order', { ascending: true });

    if (modelsError) {
      return NextResponse.json(
        { success: false, data: null, message: modelsError.message },
        { status: 500 }
      );
    }

    /* Group models by API key */
    const groups = (apiKeys || []).map((key) => ({
      id: key.id,
      platform: key.platform,
      label: key.label,
      is_active: key.is_active,
      models: (allModels || []).filter((m) => m.api_key_id === key.id),
    }));

    return NextResponse.json({
      success: true,
      data: groups,
      message: 'Models fetched successfully',
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
 * POST /api/admin/models
 * Add a new model to an API key.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { api_key_id, model_id, model_name, sort_order } = body;

    if (!api_key_id || !model_id || !model_name) {
      return NextResponse.json(
        { success: false, data: null, message: 'api_key_id, model_id, and model_name are required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    /* Verify API key exists and is global */
    const { data: apiKey } = await adminClient
      .from('api_keys')
      .select('id')
      .eq('id', api_key_id)
      .eq('is_global', true)
      .single();

    if (!apiKey) {
      return NextResponse.json(
        { success: false, data: null, message: 'API key not found' },
        { status: 404 }
      );
    }

    /* Check for duplicate model_id under same API key */
    const { data: existing } = await adminClient
      .from('global_models')
      .select('id')
      .eq('api_key_id', api_key_id)
      .eq('model_id', model_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, data: null, message: 'Model already exists for this API key' },
        { status: 409 }
      );
    }

    const { data: newModel, error: insertError } = await adminClient
      .from('global_models')
      .insert({
        api_key_id,
        model_id,
        model_name,
        is_active: true,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, data: null, message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: newModel,
      message: 'Model created successfully',
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
 * PATCH /api/admin/models
 * Update a model's name, ID, active status, or sort order.
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

    const body = await request.json();
    const { id, model_name, model_id, is_active, sort_order } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, data: null, message: 'Model ID is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const updateData: Record<string, unknown> = {};

    if (model_name !== undefined) {
      updateData.model_name = model_name;
    }
    if (model_id !== undefined) {
      updateData.model_id = model_id;
    }
    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }
    if (sort_order !== undefined) {
      updateData.sort_order = sort_order;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, data: null, message: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await adminClient
      .from('global_models')
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

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Model updated successfully',
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
 * DELETE /api/admin/models
 * Delete a model.
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

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, data: null, message: 'Model ID is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { error: deleteError } = await adminClient
      .from('global_models')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, data: null, message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: null,
      message: 'Model deleted successfully',
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