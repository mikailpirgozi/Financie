import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@finapp/ui';
import { LoanDetailClient } from './LoanDetailClient';

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactNode> {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get loan with schedule
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', id)
    .single();

  if (loanError || !loan) {
    notFound();
  }

  const { data: schedule } = await supabase
    .from('loan_schedules')
    .select('*')
    .eq('loan_id', id)
    .order('installment_no', { ascending: true });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Mark overdue installments
  const scheduleWithStatus = schedule?.map((s) => {
    const dueDate = new Date(s.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    if (s.status === 'paid') return s;
    
    if (dueDate < today) {
      return { ...s, status: 'overdue' };
    }
    
    return s;
  }) ?? [];

  const paidCount = scheduleWithStatus.filter((s) => s.status === 'paid').length;
  const overdueCount = scheduleWithStatus.filter((s) => s.status === 'overdue').length;
  
  // Calculate totals
  const totalInterest = scheduleWithStatus.reduce((sum, s) => sum + Number(s.interest_due), 0);
  const totalFees = scheduleWithStatus.reduce((sum, s) => sum + Number(s.fees_due), 0);
  const totalPayment = scheduleWithStatus.reduce((sum, s) => sum + Number(s.total_due), 0);

  // Current balance based on paid installments
  const lastPaidInstallment = scheduleWithStatus.filter((s) => s.status === 'paid').pop();
  const currentBalance = lastPaidInstallment
    ? Number(lastPaidInstallment.principal_balance_after)
    : Number(loan.principal);
  const paidPrincipal = Number(loan.principal) - currentBalance;
  
  // Next installment
  const nextPendingInstallment = scheduleWithStatus.find(
    (s) => s.status === 'pending' || s.status === 'overdue'
  );
  
  // Due soon (within 7 days)
  const dueSoonDate = new Date(today);
  dueSoonDate.setDate(dueSoonDate.getDate() + 7);
  const dueSoonCount = scheduleWithStatus.filter((s) => {
    if (s.status === 'paid') return false;
    const dueDate = new Date(s.due_date);
    return dueDate >= today && dueDate <= dueSoonDate;
  }).length;
  
  const monthlyPayment =
    scheduleWithStatus.length > 0 ? Number(scheduleWithStatus[0].total_due) : 0;
  
  const remainingInstallments = scheduleWithStatus.length - paidCount;
  
  // Loan end date
  const loanEndDate = scheduleWithStatus.length > 0
    ? new Date(scheduleWithStatus[scheduleWithStatus.length - 1].due_date)
    : null;
  
  // Days until next payment
  const daysUntilNext = nextPendingInstallment
    ? Math.ceil((new Date(nextPendingInstallment.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  // Additional useful metrics
  const totalPaid = scheduleWithStatus
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + Number(s.total_due), 0);
  
  const remainingToPay = totalPayment - totalPaid;
  
  const interestToTotalRatio = totalPayment > 0 
    ? (totalInterest / totalPayment) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/loans" className="text-sm text-muted-foreground hover:underline">
            ← Späť na úvery
          </Link>
          <h1 className="text-3xl font-bold mt-2">{loan.name || loan.lender}</h1>
          <p className="text-muted-foreground">
            {loan.name && <span>{loan.lender} · </span>}
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

      {/* Alerts */}
      {overdueCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Máte {overdueCount} {overdueCount === 1 ? 'omeškanú splátku' : 'omeškané splátky'}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Prosím uhraďte omeškané splátky čo najskôr, aby ste sa vyhli ďalším poplatkom.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {dueSoonCount > 0 && overdueCount === 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl">🔔</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">
                Máte {dueSoonCount} {dueSoonCount === 1 ? 'splátku' : 'splátky'} splatnú v najbližších 7 dňoch
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Pripravte si prostriedky na úhradu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Počiatočný zostatok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(loan.principal).toFixed(2)} €</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktuálny zostatok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentBalance.toFixed(2)} €</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Uhradená istina
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidPrincipal.toFixed(2)} €</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mesačná splátka
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyPayment.toFixed(2)} €</div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards - Row 2 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkový úrok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInterest.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">
              {interestToTotalRatio.toFixed(1)}% z celkovej sumy
            </p>
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Zostáva splatiť
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remainingToPay.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">
              Uhradené: {totalPaid.toFixed(2)} €
            </p>
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
              <span className="font-medium">
                {loan.term_months} mesiacov ({Math.floor(loan.term_months / 12)} {Math.floor(loan.term_months / 12) === 1 ? 'rok' : 'rokov'})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dátum začiatku:</span>
              <span className="font-medium">
                {new Date(loan.start_date).toLocaleDateString('sk-SK')}
              </span>
            </div>
            {loanEndDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dátum ukončenia:</span>
                <span className="font-medium">
                  {loanEndDate.toLocaleDateString('sk-SK')}
                </span>
              </div>
            )}
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
            <CardTitle>Progress a termíny</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zaplatené splátky:</span>
              <span className="font-medium">
                {paidCount} / {scheduleWithStatus.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Zostávajúce splátky:</span>
              <span className="font-medium">{remainingInstallments}</span>
            </div>
            {overdueCount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">⚠️ Omeškané splátky:</span>
                <span className="font-bold text-red-600">{overdueCount}</span>
              </div>
            )}
            {dueSoonCount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">🔔 Čoskoro splatné (7 dní):</span>
                <span className="font-medium text-orange-600">{dueSoonCount}</span>
              </div>
            )}
            {lastPaidInstallment && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Posledná splátka:</span>
                <span className="font-medium">
                  {new Date(lastPaidInstallment.due_date).toLocaleDateString('sk-SK', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            {nextPendingInstallment && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ďalšia splátka:</span>
                <span className={`font-medium ${
                  daysUntilNext !== null && daysUntilNext < 0 
                    ? 'text-red-600' 
                    : daysUntilNext !== null && daysUntilNext <= 7 
                    ? 'text-orange-600' 
                    : ''
                }`}>
                  {new Date(nextPendingInstallment.due_date).toLocaleDateString('sk-SK', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                  {daysUntilNext !== null && (
                    <span className="text-xs ml-2">
                      ({daysUntilNext < 0 
                        ? `${Math.abs(daysUntilNext)} dní po splatnosti` 
                        : daysUntilNext === 0
                        ? 'dnes'
                        : `o ${daysUntilNext} dní`})
                    </span>
                  )}
                </span>
              </div>
            )}
            {loanEndDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Koniec úveru:</span>
                <span className="font-medium">
                  {loanEndDate.toLocaleDateString('sk-SK', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
              <div
                className="bg-primary h-2.5 rounded-full"
                style={{
                  width: `${((paidCount / (scheduleWithStatus.length || 1)) * 100).toFixed(0)}%`,
                }}
              ></div>
            </div>
            <div className="text-sm text-muted-foreground text-center">
              {((paidCount / (scheduleWithStatus.length || 1)) * 100).toFixed(0)}% splatené
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
          <LoanDetailClient loanId={id} schedule={scheduleWithStatus} />
        </CardContent>
      </Card>
    </div>
  );
}

