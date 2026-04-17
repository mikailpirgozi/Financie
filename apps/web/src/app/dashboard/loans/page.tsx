import Link from 'next/link';
import { Button } from '@finapp/ui';
import { Card, CardContent } from '@finapp/ui';
import { LoansClient } from './LoansClient';
import {
  getLoans as getLoansWithMetrics,
  calculateLoansSummary,
  type LoanWithMetrics,
  type LoansSummary,
} from '@/lib/api/loans';
import { getCurrentUser, getCurrentUserHousehold } from '@/lib/auth/session';

async function getLoansData(userId: string): Promise<{
  householdId: string;
  loans: LoanWithMetrics[];
  summary: LoansSummary;
} | null> {
  const membership = await getCurrentUserHousehold(userId);
  if (!membership) {
    return null;
  }

  // POZN.: refreshLoanMetrics() sa NEVOLA pri kazdej navsteve.
  // pg_cron job refresh-loan-metrics bezi kazdych 5 minut a po platbe
  // sa metrika invaliduje cez RPC refresh_loan_metrics_safe v pay route.

  // Get loans with pre-computed metrics (single optimized query)
  const loans = await getLoansWithMetrics(membership.household_id);

  // Calculate summary statistics server-side
  const summary = calculateLoansSummary(loans);

  return { householdId: membership.household_id, loans, summary };
}

export default async function LoansPage(): Promise<React.ReactNode> {
  const { user } = await getCurrentUser();
  if (!user) return null;

  const loansData = await getLoansData(user.id);

  if (!loansData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Úvery</h1>
          <p className="text-muted-foreground">Správa vašich úverov a splátok</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Žiadna domácnosť</h3>
            <p className="text-muted-foreground text-center mb-4">
              Nemáte priradenú žiadnu domácnosť. Kontaktujte administrátora alebo sa zaregistrujte
              znova.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { loans, summary } = loansData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Úvery</h1>
          <p className="text-muted-foreground">Správa vašich úverov a splátok</p>
        </div>
        <Link href="/dashboard/loans/new">
          <Button>➕ Nový úver</Button>
        </Link>
      </div>

      {loans.length === 0 ? (
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
        <LoansClient loans={loans} summary={summary} />
      )}
    </div>
  );
}
