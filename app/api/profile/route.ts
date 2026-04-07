import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

function calculateCompletion(p: Record<string, unknown>): number {
  const checks: boolean[] = [
    !!p.full_name, !!p.job_title, !!p.company, !!p.industry,
    !!p.experience_level, !!p.location,
    Array.isArray(p.expertise_areas) && (p.expertise_areas as string[]).length > 0,
    !!p.key_skills,
    Array.isArray(p.linkedin_goals) && (p.linkedin_goals as string[]).length > 0,
    !!p.target_audience_description,
    !!p.preferred_tone,
    !!p.preferred_post_length,
    !!p.writing_samples,
    !!p.notable_achievements,
    !!p.audience_pain_points,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase.from('user_professional_profiles').select('*').eq('user_id', user.id).single();
    if (error && error.code !== 'PGRST116') throw error;

    return NextResponse.json({ success: true, data: data || null, message: 'OK' });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const payload = { ...body, user_id: user.id, updated_at: new Date().toISOString() };

    const { data, error } = await supabase.from('user_professional_profiles').upsert(payload, { onConflict: 'user_id' }).select().single();
    if (error) throw error;

    const pct = calculateCompletion(data as Record<string, unknown>);
    await supabase.from('profiles').update({ profile_completion_percent: pct, updated_at: new Date().toISOString() }).eq('id', user.id);

    return NextResponse.json({ success: true, data, message: 'Profile saved' });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Failed to save profile', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, data: null, message: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const payload = { ...body, user_id: user.id, updated_at: new Date().toISOString() };

    const { data, error } = await supabase.from('user_professional_profiles').upsert(payload, { onConflict: 'user_id' }).select().single();
    if (error) throw error;

    const pct = calculateCompletion(data as Record<string, unknown>);
    await supabase.from('profiles').update({ profile_completion_percent: pct, updated_at: new Date().toISOString() }).eq('id', user.id);

    return NextResponse.json({ success: true, data, message: 'Profile updated' });
  } catch (error) {
    return NextResponse.json({ success: false, data: null, message: 'Failed to update profile', error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : '') : undefined }, { status: 500 });
  }
}