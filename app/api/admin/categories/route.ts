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
    const { data: categories, error } = await adminClient
      .from('persona_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    /* Count personas per category */
    const withCounts = await Promise.all(
      (categories || []).map(async (cat) => {
        const { count } = await adminClient
          .from('personas')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id);
        return { ...cat, persona_count: count || 0 };
      })
    );

    return NextResponse.json({ success: true, data: withCounts, message: 'Categories fetched' });
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
    const { name, name_en, icon, description, sort_order } = body;
    if (!name || !name_en) {
      return NextResponse.json({ success: false, data: null, message: 'Name (AR) and Name (EN) are required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: category, error } = await adminClient
      .from('persona_categories')
      .insert({ name, name_en, icon: icon || null, description: description || null, sort_order: sort_order ?? 0, is_active: true })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: category, message: 'Category created' });
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
    const { id, ...fields } = body;
    if (!id) {
      return NextResponse.json({ success: false, data: null, message: 'Category ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const allowed = ['name', 'name_en', 'icon', 'description', 'sort_order', 'is_active'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (fields[key] !== undefined) updateData[key] = fields[key];
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, data: null, message: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error } = await adminClient
      .from('persona_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated, message: 'Category updated' });
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
    const { id, action, targetCategoryId } = body;
    if (!id) {
      return NextResponse.json({ success: false, data: null, message: 'Category ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    /* Check persona count */
    const { count: personaCount } = await adminClient
      .from('personas')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (personaCount && personaCount > 0) {
      if (action === 'move') {
        if (!targetCategoryId) {
          return NextResponse.json({ success: false, data: null, message: 'Target category is required for move action' }, { status: 400 });
        }
        /* Move personas to target category */
        const { error: moveError } = await adminClient
          .from('personas')
          .update({ category_id: targetCategoryId })
          .eq('category_id', id);
        if (moveError) {
          return NextResponse.json({ success: false, data: null, message: moveError.message }, { status: 500 });
        }
      } else if (action === 'delete') {
        /* Delete all personas in this category */
        const { error: deletePersonasError } = await adminClient
          .from('personas')
          .delete()
          .eq('category_id', id);
        if (deletePersonasError) {
          return NextResponse.json({ success: false, data: null, message: deletePersonasError.message }, { status: 500 });
        }
      }
    }

    /* Delete the category */
    const { error: deleteError } = await adminClient
      .from('persona_categories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ success: false, data: null, message: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: null, message: 'Category deleted' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? message : undefined }, { status: 500 });
  }
}