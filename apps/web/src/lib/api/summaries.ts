import { createClient } from '../supabase/server';

export async function getMonthlySummaries(householdId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('monthly_summaries')
    .select('*')
    .eq('household_id', householdId)
    .order('month', { ascending: false });

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

