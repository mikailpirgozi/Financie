import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';

export default async function SummariesPage(): Promise<React.ReactNode> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's household
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) return null;

  // Get summaries
  const { data: summaries } = await supabase
    .from('monthly_summaries')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('month', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mesačné výkazy</h1>
        <p className="text-muted-foreground">História vašich mesačných vyúčtovaní</p>
      </div>

      {!summaries || summaries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📈</div>
            <h3 className="text-lg font-semibold mb-2">Žiadne výkazy</h3>
            <p className="text-muted-foreground text-center mb-4">
              Mesačné výkazy sa generujú automaticky na konci každého mesiaca.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => {
            const netBalance =
              Number(summary.incomes_total) -
              Number(summary.expenses_total) -
              Number(summary.loan_interest_paid) -
              Number(summary.loan_fees_paid);

            return (
              <Link key={summary.id} href={`/dashboard/summaries/${summary.month}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {new Date(summary.month + '-01').toLocaleDateString('sk-SK', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Príjmy:</span>
                      <span className="font-medium text-green-600">
                        +{Number(summary.incomes_total).toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Výdavky:</span>
                      <span className="font-medium text-red-600">
                        -{Number(summary.expenses_total).toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Úroky:</span>
                      <span className="font-medium text-red-600">
                        -{Number(summary.loan_interest_paid).toFixed(2)} €
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-medium">Bilancia:</span>
                      <span
                        className={`font-bold ${
                          netBalance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {netBalance >= 0 ? '+' : ''}
                        {netBalance.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Čistá hodnota:</span>
                      <span className="font-medium">
                        {Number(summary.net_worth).toFixed(2)} €
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}


