import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@finapp/ui';
import { InsightsView } from '@/components/insights/InsightsView';

export const dynamic = 'force-dynamic';

export default async function InsightsPage(): Promise<React.ReactNode> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insights nedostupné</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Najprv sa pridajte do domácnosti, aby sme vedeli analyzovať vaše dáta.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Insights</h1>
        <p className="text-muted-foreground">
          Prehľad vašich financií a personalizované odporúčania.
        </p>
      </div>

      <InsightsView householdId={membership.household_id} />
    </div>
  );
}
