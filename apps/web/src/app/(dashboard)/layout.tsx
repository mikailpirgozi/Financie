import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Get all households user is member of
  const { data: allMemberships } = await supabase
    .from('household_members')
    .select(`
      household_id,
      role,
      households:household_id (
        id,
        name
      )
    `)
    .eq('user_id', user.id);

  const households = allMemberships?.map(m => {
    const household = m.households as unknown as { id: string; name: string } | null;
    return {
      id: m.household_id,
      name: household?.name || 'Domácnosť',
      role: m.role,
    };
  }) || [];

  return (
    <DashboardLayoutClient 
      user={user} 
      householdId={membership?.household_id}
      households={households}
    >
      {children}
    </DashboardLayoutClient>
  );
}

