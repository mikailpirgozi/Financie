import { createClient } from '../supabase/server';
import type { CreateIncomeInput } from '@finapp/core';

export async function createIncome(input: CreateIncomeInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('incomes')
    .insert({
      household_id: input.householdId,
      date: input.date.toISOString().split('T')[0],
      amount: input.amount,
      source: input.source,
      category_id: input.categoryId,
      note: input.note ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getIncomes(householdId: string, filters?: {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
}) {
  const supabase = await createClient();

  let query = supabase
    .from('incomes')
    .select(`
      *,
      categories (
        id,
        name,
        kind
      )
    `)
    .eq('household_id', householdId)
    .order('date', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('date', filters.startDate.toISOString().split('T')[0]);
  }

  if (filters?.endDate) {
    query = query.lte('date', filters.endDate.toISOString().split('T')[0]);
  }

  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getIncome(incomeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('incomes')
    .select(`
      *,
      categories (
        id,
        name,
        kind
      )
    `)
    .eq('id', incomeId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateIncome(
  incomeId: string,
  updates: Partial<CreateIncomeInput>
) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};

  if (updates.date) {
    updateData.date = updates.date.toISOString().split('T')[0];
  }
  if (updates.amount !== undefined) {
    updateData.amount = updates.amount;
  }
  if (updates.source) {
    updateData.source = updates.source;
  }
  if (updates.categoryId) {
    updateData.category_id = updates.categoryId;
  }
  if (updates.note !== undefined) {
    updateData.note = updates.note;
  }

  const { data, error } = await supabase
    .from('incomes')
    .update(updateData)
    .eq('id', incomeId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIncome(incomeId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('incomes')
    .delete()
    .eq('id', incomeId);

  if (error) throw error;
}

