import { createClient } from '../supabase/server';

export async function savePushToken(
  userId: string,
  token: string,
  deviceId?: string,
  platform?: 'ios' | 'android' | 'web'
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        token,
        device_id: deviceId,
        platform,
      },
      {
        onConflict: 'user_id,token',
      }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePushToken(userId: string, token: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);

  if (error) throw error;
}

export async function getUserPushTokens(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('push_tokens')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

