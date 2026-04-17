import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';
import { getCurrentUser, getCurrentUserHousehold } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactNode> {
  // Pouzivame react cache() — deduplikuje volania v ramci jedneho RSC stromu,
  // takze podstranky pod /dashboard znova nezavolaju supabase.auth.getUser()
  // ani household_members query.
  const { user } = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Get current locale from cookies
  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || 'sk';

  // Primárna domácnosť (cached per-request)
  const membership = await getCurrentUserHousehold(user.id);

  // Get all households user is member of (separate query – nie v cache, lebo
  // sa pouziva len v layoute pre switcher).
  const supabase = await createClient();
  const { data: allMemberships } = await supabase
    .from('household_members')
    .select(
      `
      household_id,
      role,
      households:household_id (
        id,
        name
      )
    `
    )
    .eq('user_id', user.id);

  const households =
    allMemberships?.map((m) => {
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
      locale={locale}
    >
      {children}
    </DashboardLayoutClient>
  );
}
