import { createServerClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const createServerSupabaseClient = (req: NextRequest) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createServerClient(supabaseUrl, supabaseServiceRoleKey, { req });
};