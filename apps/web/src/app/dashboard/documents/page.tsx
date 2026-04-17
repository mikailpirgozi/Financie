import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DocumentsClient } from './DocumentsClient';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage(): Promise<ReactNode> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    // No onboarding flow exists yet - redirect back to dashboard which
    // shows the empty-state for users without a household.
    redirect('/dashboard');
  }

  // Fetch assets (vehicles) for filters
  const { data: assets } = await supabase
    .from('assets')
    .select('id, kind, name, license_plate')
    .eq('household_id', membership.household_id)
    .order('name');

  return <DocumentsClient householdId={membership.household_id} assets={assets || []} />;
}
