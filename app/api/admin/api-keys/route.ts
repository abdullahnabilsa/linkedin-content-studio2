import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import { encrypt } from '@/lib/encryption';

/**
 * GET /api/admin/api-keys
 * List all global (public) API keys with model counts.
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

    const { data: keys, error: keysError } = await adminClient
      .from('api_keys')
      .select('id, platform, label, is_active, is_global, last_used_at, created_at')
      .eq('is_global', true)
      .order('created_at', { ascending: false });

    if (keysError) {
      return NextResponse.json(
        { success: false, data: null, message: keysError.message },
        { status: 500 }
      );
    }

    /* Get model counts per key */
    const keysWithCounts = await Promise.all(
      (keys || []).map(async (key) => {
        const { count } = await adminClient
          .from('global_models')
          .select('*', { count: 'exact', head: true })
          .eq('api_key_id', key.id);

        return {
          ...key,
          model_count: count || 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: keysWithCounts,
      message: 'API keys fetched successfully',
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
 * POST /api/admin/api-keys
 * Create a new global API key (encrypted).
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
    const { platform, key, label } = body;

    if (!platform || !key || !label) {
      return NextResponse.json(
        { success: false, data: null, message: 'Platform, key, and label are required' },
        { status: 400 }
      );
    }

    /* Validate platform */
    const validPlatforms = [
      'openrouter',
      'groq',
      'openai',
      'anthropic',
      'gemini',
      'together',
      'mistral',
    ];

    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { success: false, data: null, message: 'Invalid platform' },
        { status: 400 }
      );
    }

    /* Encrypt the API key */
    const encryptedKey = encrypt(key);

    const adminClient = createAdminClient();

    const { data: newKey, error: insertError } = await adminClient
      .from('api_keys')
      .insert({
        user_id: null,
        platform,
        encrypted_key: encryptedKey,
        label,
        is_global: true,
        is_active: true,
      })
      .select('id, platform, label, is_active, is_global, created_at')
      .single();

    if (insertError) {
      return NextResponse.json(
        { success: false, data: null, message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { ...newKey, model_count: 0 },
      message: 'API key created successfully',
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
 * PATCH /api/admin/api-keys
 * Update a global API key's label, key, or active status.
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

    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (prof?.role !== 'admin') {
      return NextResponse.json(
        { success: false, data: null, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, label, key, is_active } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, data: null, message: 'API key ID is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    /* Verify key exists and is global */
    const { data: existing, error: existError } = await adminClient
      .from('api_keys')
      .select('id, is_global')
      .eq('id', id)
      .eq('is_global', true)
      .single();

    if (existError || !existing) {
      return NextResponse.json(
        { success: false, data: null, message: 'API key not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (label !== undefined) {
      updateData.label = label;
    }

    if (key !== undefined && key !== '') {
      updateData.encrypted_key = encrypt(key);
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, data: null, message: 'No fields to update' },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await adminClient
      .from('api_keys')
      .update(updateData)
      .eq('id', id)
      .select('id, platform, label, is_active, is_global, last_used_at, created_at')
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
      message: 'API key updated successfully',
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
 * DELETE /api/admin/api-keys
 * Delete a global API key and its associated models.
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

    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (prof?.role !== 'admin') {
      return NextResponse.json(
        { success: false, data: null, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, data: null, message: 'API key ID is required' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    /* Verify key exists and is global */
    const { data: existing } = await adminClient
      .from('api_keys')
      .select('id, is_global')
      .eq('id', id)
      .eq('is_global', true)
      .single();

    if (!existing) {
      return NextResponse.json(
        { success: false, data: null, message: 'API key not found' },
        { status: 404 }
      );
    }

    /* Delete associated models first (CASCADE should handle this, but be explicit) */
    await adminClient
      .from('global_models')
      .delete()
      .eq('api_key_id', id);

    /* Delete the key */
    const { error: deleteError } = await adminClient
      .from('api_keys')
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
      message: 'API key deleted successfully',
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