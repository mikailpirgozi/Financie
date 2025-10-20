import { createClient } from '../supabase/server';

export async function getCurrentHousehold(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role, households(*)')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

