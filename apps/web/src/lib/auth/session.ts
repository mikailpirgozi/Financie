import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

/**
 * Vrati prihlaseneho usera. Volania su deduplikovane v ramci jedneho
 * RSC requestu cez React `cache()`. Middleware uz session validuje,
 * tu len citame z cookies.
 */
export const getCurrentUser = cache(async (): Promise<{ user: User | null }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { user };
});

/**
 * Vrati membership zaznam (household_id) pre dany userId.
 * Deduplikuje sa per-request – ak ho zavola viac stranok/komponentov v jednom
 * RSC strome, dotaz beze raz.
 */
export const getCurrentUserHousehold = cache(
  async (userId: string): Promise<{ household_id: string } | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('getCurrentUserHousehold failed:', error.message);
      return null;
    }
    return data;
  }
);

/**
 * Vrati kombinaciu user + householdId v jednom volani.
 * Pouzi v RSC root layout/page namiesto opakovanej autentifikacie.
 */
export const getCurrentSession = cache(async () => {
  const { user } = await getCurrentUser();
  if (!user) return { user: null, householdId: null as string | null };

  const membership = await getCurrentUserHousehold(user.id);
  return { user, householdId: membership?.household_id ?? null };
});
