import { createClient } from '../supabase/server';
import type { CreateCategoryInput } from '@finapp/core';

export async function createCategory(input: CreateCategoryInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      household_id: input.householdId,
      kind: input.kind,
      name: input.name,
      parent_id: input.parentId ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCategories(householdId: string, kind?: string) {
  const supabase = await createClient();

  let query = supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('name', { ascending: true });

  if (kind) {
    query = query.eq('kind', kind);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function updateCategory(
  categoryId: string,
  updates: Partial<CreateCategoryInput>
) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};

  if (updates.name) {
    updateData.name = updates.name;
  }
  if (updates.parentId !== undefined) {
    updateData.parent_id = updates.parentId;
  }

  const { data, error } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId);

  if (error) throw error;
}

