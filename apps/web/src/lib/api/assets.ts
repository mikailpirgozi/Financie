import { createClient } from '../supabase/server';
import type { CreateAssetInput, UpdateAssetValueInput } from '@finapp/core';

export async function createAsset(input: CreateAssetInput) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('assets')
    .insert({
      household_id: input.householdId,
      kind: input.kind,
      name: input.name,
      acquisition_value: input.acquisitionValue,
      current_value: input.currentValue,
      acquisition_date: input.acquisitionDate.toISOString().split('T')[0],
      index_rule: input.indexRule ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAssets(householdId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('assets')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAsset(assetId: string) {
  const supabase = await createClient();

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (assetError) throw assetError;

  // Get valuations history
  const { data: valuations, error: valuationsError } = await supabase
    .from('asset_valuations')
    .select('*')
    .eq('asset_id', assetId)
    .order('date', { ascending: false });

  if (valuationsError) throw valuationsError;

  return { asset, valuations: valuations ?? [] };
}

export async function updateAsset(
  assetId: string,
  updates: Partial<CreateAssetInput>
) {
  const supabase = await createClient();

  const updateData: Record<string, unknown> = {};

  if (updates.name) {
    updateData.name = updates.name;
  }
  if (updates.currentValue !== undefined) {
    updateData.current_value = updates.currentValue;
  }
  if (updates.indexRule !== undefined) {
    updateData.index_rule = updates.indexRule;
  }

  const { data, error } = await supabase
    .from('assets')
    .update(updateData)
    .eq('id', assetId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAsset(assetId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('id', assetId);

  if (error) throw error;
}

export async function addAssetValuation(input: UpdateAssetValueInput) {
  const supabase = await createClient();

  // Insert valuation
  const { data: valuation, error: valuationError } = await supabase
    .from('asset_valuations')
    .insert({
      asset_id: input.assetId,
      date: input.date.toISOString().split('T')[0],
      value: input.value,
      source: input.source,
    })
    .select()
    .single();

  if (valuationError) throw valuationError;

  // Update asset current_value
  const { error: updateError } = await supabase
    .from('assets')
    .update({ current_value: input.value })
    .eq('id', input.assetId);

  if (updateError) throw updateError;

  return valuation;
}

