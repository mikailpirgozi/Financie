import { createClient } from '../supabase/server';

const MONTHLY_SUMMARIES_DEFAULT_LIMIT = 24; // 2 roky

export async function getMonthlySummaries(householdId: string, options?: { limit?: number }) {
  const supabase = await createClient();

  const limit = Math.min(options?.limit ?? MONTHLY_SUMMARIES_DEFAULT_LIMIT, 120);

  const { data, error } = await supabase
    .from('monthly_summaries')
    .select('*')
    .eq('household_id', householdId)
    .order('month', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getMonthlySummary(householdId: string, month: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('monthly_summaries')
    .select('*')
    .eq('household_id', householdId)
    .eq('month', month)
    .single();

  if (error) throw error;
  return data;
}
