'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';
import { DeleteDialog } from '@/components/DeleteDialog';
import type { LoanWithMetrics, LoansSummary } from '@/lib/api/loans';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';

interface LoansClientProps {
  loans: LoanWithMetrics[];
  summary: LoansSummary;
}

/**
 * Pure display component for loans list.
 * All data fetching and calculations are done server-side.
 * This component only handles rendering and user interactions.
 */
export function LoansClient({ loans, summary }: LoansClientProps): React.JSX.Element {
  const router = useRouter();

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/loans/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Nepodarilo sa zmazať úver');
    }

    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Mini Widget */}
      <Card className="bg-linear-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">💰 Zostatok:</span>
              <span className="font-bold">{formatCurrency(summary.totalBalance)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">📅 Mesačne:</span>
              <span className="font-bold">{formatCurrency(summary.totalMonthlyPayment)}</span>
            </div>
            {summary.overdueCount > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <span className="font-medium">⚠️ {summary.overdueCount} omeškané</span>
              </div>
            )}
            {summary.dueSoonCount > 0 && summary.overdueCount === 0 && (
              <div className="flex items-center gap-2 text-orange-600">
                <span className="font-medium">🔔 {summary.dueSoonCount} čoskoro</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Celkový zostatok
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              z {summary.loanCount} {summary.loanCount === 1 ? 'úveru' : 'úverov'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mesačné splátky
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalMonthlyPayment)}</div>
            <p className="text-xs text-muted-foreground mt-1">spolu</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Splatené
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSplatene}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrencyCompact(summary.totalPaid)} ✅
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ďalšia splátka
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.nextPayment ? (
              <>
                <div className="text-2xl font-bold">
                  {new Date(summary.nextPayment.date).toLocaleDateString('sk-SK', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrencyCompact(summary.nextPayment.amount)} (
                  {summary.nextPayment.daysUntil < 0
                    ? `${Math.abs(summary.nextPayment.daysUntil)} dní po splatnosti`
                    : summary.nextPayment.daysUntil === 0
                    ? 'dnes'
                    : `o ${summary.nextPayment.daysUntil} dní`}
                  )
                </p>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">Žiadne splátky</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {summary.overdueCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                URGENTNÉ: {summary.overdueCount} {summary.overdueCount === 1 ? 'splátka' : 'splátky'} po splatnosti!
              </h3>
              <p className="text-sm text-red-700 mt-1">
                Prosím uhraďte omeškané splátky čo najskôr, aby ste sa vyhli ďalším poplatkom.
              </p>
            </div>
          </div>
        </div>
      )}

      {summary.dueSoonCount > 0 && summary.overdueCount === 0 && (
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl">🔔</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-orange-800">
                Máte {summary.dueSoonCount} {summary.dueSoonCount === 1 ? 'splátku' : 'splátky'} splatnú v najbližších 7 dňoch
              </h3>
              <p className="text-sm text-orange-700 mt-1">
                Pripravte si prostriedky na úhradu.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prehľad úverov</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Úver</th>
                  <th className="text-right p-2">Suma<br/><span className="text-xs font-normal text-muted-foreground">Pôv → Zost</span></th>
                  <th className="text-right p-2">Splátka mesačne<br/><span className="text-xs font-normal text-muted-foreground">Celkom (Ist/Úrok)</span></th>
                  <th className="text-left p-2">Splatené</th>
                  <th className="text-center p-2">Ďalšia</th>
                  <th className="text-center p-2">Akcie</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const progress = loan.total_installments > 0
                    ? (loan.paid_count / loan.total_installments) * 100
                    : 0;

                  // Determine next installment status display
                  let nextStatus = '✅';
                  let nextText = 'OK';
                  let nextClass = '';

                  if (loan.next_installment) {
                    const daysUntil = loan.next_installment.days_until;

                    if (daysUntil < 0) {
                      nextStatus = '⚠️';
                      nextText = `${Math.abs(daysUntil)} om.`;
                      nextClass = 'text-red-600 font-bold';
                    } else if (daysUntil <= 7) {
                      nextStatus = '🔔';
                      nextText = `${daysUntil} dní`;
                      nextClass = 'text-orange-600';
                    } else {
                      nextText = `${daysUntil} dní`;
                    }
                  }

                  // Get monthly payment details from next_installment
                  // Note: principal_due and interest_due may not exist before migration runs
                  const monthlyPayment = loan.next_installment 
                    ? Number(loan.next_installment.total_due) 
                    : 0;
                  const principalDue = loan.next_installment?.principal_due 
                    ? Number(loan.next_installment.principal_due) 
                    : 0;
                  const interestDue = loan.next_installment?.interest_due 
                    ? Number(loan.next_installment.interest_due) 
                    : 0;

                  return (
                    <tr key={loan.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="font-medium">{loan.name || loan.lender}</div>
                        <div className="text-xs text-muted-foreground">
                          {loan.name && <span>{loan.lender} · </span>}
                          {loan.loan_type === 'annuity' && 'Anuitný'}
                          {loan.loan_type === 'fixed_principal' && 'Fixná istina'}
                          {loan.loan_type === 'interest_only' && 'Len úrok'}
                        </div>
                      </td>
                      <td className="text-right p-2">
                        <div className="font-medium">
                          {formatCurrency(loan.principal)} → {formatCurrency(loan.current_balance)}
                        </div>
                      </td>
                      <td className="text-right p-2">
                        <div className="font-medium">{formatCurrency(monthlyPayment.toFixed(2))}</div>
                        <div className="text-xs text-muted-foreground">
                          ({formatCurrency(principalDue.toFixed(2))}/{formatCurrency(interestDue.toFixed(2))})
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-xs font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {loan.paid_count}/{loan.total_installments} splátok
                        </div>
                      </td>
                      <td className={`text-center p-2 ${nextClass}`}>
                        <div>{nextStatus} {nextText}</div>
                      </td>
                      <td className="text-center p-2">
                        <div className="flex gap-1 justify-center">
                          <Link href={`/dashboard/loans/${loan.id}`}>
                            <Button variant="outline" size="sm">
                              Detail
                            </Button>
                          </Link>
                          <Link href={`/dashboard/loans/${loan.id}/edit`}>
                            <Button variant="outline" size="sm">
                              ✏️
                            </Button>
                          </Link>
                          <DeleteDialog
                            title="Zmazať úver"
                            description={`Naozaj chcete zmazať úver "${loan.name || loan.lender}"?`}
                            onConfirm={() => handleDelete(loan.id)}
                            trigger={
                              <Button variant="destructive" size="sm">
                                🗑️
                              </Button>
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
