import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';

export default async function LoanDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get loan with schedule
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', params.id)
    .single();

  if (loanError || !loan) {
    notFound();
  }

  const { data: schedule } = await supabase
    .from('loan_schedules')
    .select('*')
    .eq('loan_id', params.id)
    .order('installment_no', { ascending: true });

  const paidCount = schedule?.filter((s) => s.status === 'paid').length ?? 0;
  const overdueCount = schedule?.filter((s) => s.status === 'overdue').length ?? 0;
  const totalInterest = schedule?.reduce((sum, s) => sum + Number(s.interest_due), 0) ?? 0;
  const totalFees = schedule?.reduce((sum, s) => sum + Number(s.fees_due), 0) ?? 0;
  const totalPayment = schedule?.reduce((sum, s) => sum + Number(s.total_due), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/loans" className="text-sm text-muted-foreground hover:underline">
            ← Späť na úvery
          </Link>
          <h1 className="text-3xl font-bold mt-2">{loan.lender}</h1>
          <p className="text-muted-foreground">
            {loan.loan_type === 'annuity' && 'Anuitný úver'}
            {loan.loan_type === 'fixed_principal' && 'Fixná istina'}
            {loan.loan_type === 'interest_only' && 'Interest-only'}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Istina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(loan.principal).toFixed(2)} €</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkový úrok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInterest.toFixed(2)} €</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkové poplatky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFees.toFixed(2)} €</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkom na splatenie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayment.toFixed(2)} €</div>
          </CardContent>
        </Card>
      </div>

      {/* Loan Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detaily úveru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ročný úrok:</span>
              <span className="font-medium">{Number(loan.annual_rate).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Doba splácania:</span>
              <span className="font-medium">{loan.term_months} mesiacov</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dátum začiatku:</span>
              <span className="font-medium">
                {new Date(loan.start_date).toLocaleDateString('sk-SK')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Day-count:</span>
              <span className="font-medium">{loan.day_count_convention}</span>
            </div>
            {loan.fee_setup > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vstupný poplatok:</span>
                <span className="font-medium">{Number(loan.fee_setup).toFixed(2)} €</span>
              </div>
            )}
            {loan.fee_monthly > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mesačný poplatok:</span>
                <span className="font-medium">{Number(loan.fee_monthly).toFixed(2)} €</span>
              </div>
            )}
            {loan.insurance_monthly > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Poistenie:</span>
                <span className="font-medium">{Number(loan.insurance_monthly).toFixed(2)} €</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zaplatené splátky:</span>
              <span className="font-medium">
                {paidCount} / {schedule?.length ?? 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Omeškané splátky:</span>
              <span className={`font-medium ${overdueCount > 0 ? 'text-red-600' : ''}`}>
                {overdueCount}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{
                  width: `${((paidCount / (schedule?.length ?? 1)) * 100).toFixed(0)}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Splátkový kalendár</CardTitle>
          <CardDescription>
            Kompletný harmonogram splátok s rozpadom istiny, úroku a poplatkov
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Dátum</th>
                  <th className="text-right p-2">Istina</th>
                  <th className="text-right p-2">Úrok</th>
                  <th className="text-right p-2">Poplatky</th>
                  <th className="text-right p-2">Celkom</th>
                  <th className="text-right p-2">Zostatok</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {schedule?.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">{entry.installment_no}</td>
                    <td className="p-2">
                      {new Date(entry.due_date).toLocaleDateString('sk-SK')}
                    </td>
                    <td className="text-right p-2">
                      {Number(entry.principal_due).toFixed(2)} €
                    </td>
                    <td className="text-right p-2">
                      {Number(entry.interest_due).toFixed(2)} €
                    </td>
                    <td className="text-right p-2">{Number(entry.fees_due).toFixed(2)} €</td>
                    <td className="text-right p-2 font-medium">
                      {Number(entry.total_due).toFixed(2)} €
                    </td>
                    <td className="text-right p-2 text-muted-foreground">
                      {Number(entry.principal_balance_after).toFixed(2)} €
                    </td>
                    <td className="text-center p-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs ${
                          entry.status === 'paid'
                            ? 'bg-green-100 text-green-700'
                            : entry.status === 'overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {entry.status === 'paid' && 'Zaplatené'}
                        {entry.status === 'overdue' && 'Omeškané'}
                        {entry.status === 'pending' && 'Čaká'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

