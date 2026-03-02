/* c:\Users\Anton\Desktop\OLD FILES\GOALS\AI\GitHub 2025\CPE\app\actions\favoriteActions.ts */
'use server';

import { createClient } from '@supabase/supabase-js';

export async function toggleExamFavorite(id: string, isFavorite: boolean) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Use the Service Role Key if available to bypass RLS, otherwise fallback to Anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('exams')
    .update({ is_favorite: isFavorite })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
  
  return { success: true };
}
