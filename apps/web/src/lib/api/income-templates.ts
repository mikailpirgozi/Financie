import { createClient } from '@/lib/supabase/server';
import {
  createIncomeTemplateSchema,
  updateIncomeTemplateSchema,
  type CreateIncomeTemplateInput,
  type UpdateIncomeTemplateInput,
} from '@finapp/core';

export async function createIncomeTemplate(input: CreateIncomeTemplateInput) {
  const validated = createIncomeTemplateSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('income_templates')
    .insert({
      household_id: validated.householdId,
      name: validated.name,
      category_id: validated.categoryId,
      default_amount: validated.defaultAmount,
      note: validated.note,
      is_active: validated.isActive,
      sort_order: validated.sortOrder,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getIncomeTemplates(householdId: string, activeOnly = true) {
  const supabase = await createClient();

  let query = supabase
    .from('income_templates')
    .select(`
      *,
      categories (
        id,
        name,
        kind
      )
    `)
    .eq('household_id', householdId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getIncomeTemplate(templateId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('income_templates')
    .select(`
      *,
      categories (
        id,
        name,
        kind
      )
    `)
    .eq('id', templateId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateIncomeTemplate(
  templateId: string,
  input: UpdateIncomeTemplateInput
) {
  const validated = updateIncomeTemplateSchema.parse(input);
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};
  if (validated.name !== undefined) updateData.name = validated.name;
  if (validated.categoryId !== undefined) updateData.category_id = validated.categoryId;
  if (validated.defaultAmount !== undefined) updateData.default_amount = validated.defaultAmount;
  if (validated.note !== undefined) updateData.note = validated.note;
  if (validated.isActive !== undefined) updateData.is_active = validated.isActive;
  if (validated.sortOrder !== undefined) updateData.sort_order = validated.sortOrder;

  const { data, error } = await supabase
    .from('income_templates')
    .update(updateData)
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteIncomeTemplate(templateId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('income_templates')
    .delete()
    .eq('id', templateId);

  if (error) throw error;
}

