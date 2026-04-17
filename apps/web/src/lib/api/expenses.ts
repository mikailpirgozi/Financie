import { createClient } from '../supabase/server';
import type { CreateExpenseInput } from '@finapp/core';

export async function createExpense(input: CreateExpenseInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      household_id: input.householdId,
      date: input.date.toISOString().split('T')[0],
      amount: input.amount,
      category_id: input.categoryId,
      merchant: input.merchant ?? null,
      note: input.note ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Limit pre default get-all (chrani pred neohranicenymi vystupmi). */
const EXPENSES_DEFAULT_LIMIT = 200;

export async function getExpenses(
  householdId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    categoryId?: string;
    /** Override default limit (max 1000). */
    limit?: number;
    /** 0-based offset pre stránkovanie. */
    offset?: number;
  }
) {
  const supabase = await createClient();

  const limit = Math.min(filters?.limit ?? EXPENSES_DEFAULT_LIMIT, 1000);
  const offset = filters?.offset ?? 0;

  let query = supabase
    .from('expenses')
    .select(`*, categories (id, name, kind)`)
    .eq('household_id', householdId)
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1);

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

export async function getExpense(expenseId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('expenses')
    .select(
      `
      *,
      categories (
        id,
        name,
        kind
      )
    `
    )
    .eq('id', expenseId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateExpense(expenseId: string, updates: Partial<CreateExpenseInput>) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};

  if (updates.date) {
    updateData.date = updates.date.toISOString().split('T')[0];
  }
  if (updates.amount !== undefined) {
    updateData.amount = updates.amount;
  }
  if (updates.categoryId) {
    updateData.category_id = updates.categoryId;
  }
  if (updates.merchant !== undefined) {
    updateData.merchant = updates.merchant;
  }
  if (updates.note !== undefined) {
    updateData.note = updates.note;
  }

  const { data, error } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteExpense(expenseId: string) {
  const supabase = await createClient();

  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);

  if (error) throw error;
}
