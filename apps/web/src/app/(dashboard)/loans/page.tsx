import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';

export default async function LoansPage() {
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

  // Get loans
  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .eq('household_id', membership.household_id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Úvery</h1>
          <p className="text-muted-foreground">
            Správa vašich úverov a splátok
          </p>
        </div>
        <Link href="/dashboard/loans/new">
          <Button>➕ Nový úver</Button>
        </Link>
      </div>

      {!loans || loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-lg font-semibold mb-2">Žiadne úvery</h3>
            <p className="text-muted-foreground text-center mb-4">
              Zatiaľ nemáte vytvorený žiadny úver. Začnite pridaním nového úveru.
            </p>
            <Link href="/dashboard/loans/new">
              <Button>Pridať prvý úver</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loans.map((loan) => (
            <Link key={loan.id} href={`/dashboard/loans/${loan.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{loan.lender}</CardTitle>
                      <CardDescription>
                        {loan.loan_type === 'annuity' && 'Anuitný úver'}
                        {loan.loan_type === 'fixed_principal' && 'Fixná istina'}
                        {loan.loan_type === 'interest_only' && 'Interest-only'}
                      </CardDescription>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        loan.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : loan.status === 'paid_off'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {loan.status === 'active' && 'Aktívny'}
                      {loan.status === 'paid_off' && 'Splatený'}
                      {loan.status === 'defaulted' && 'Defaultný'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Istina:</span>
                    <span className="font-medium">
                      {Number(loan.principal).toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Úrok:</span>
                    <span className="font-medium">{Number(loan.annual_rate).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Obdobie:</span>
                    <span className="font-medium">{loan.term_months} mesiacov</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Začiatok:</span>
                    <span className="font-medium">
                      {new Date(loan.start_date).toLocaleDateString('sk-SK')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

