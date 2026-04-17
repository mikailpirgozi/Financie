'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { Button } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';
import { DeleteDialog } from '@/components/DeleteDialog';
import { LoanHeroCard, LoanCard, SegmentControl, type SegmentOption } from '@/components/loans';
import { Input } from '@/components/ui/input';
import type { LoanWithMetrics, LoansSummary } from '@/lib/api/loans';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface LoansClientProps {
  loans: LoanWithMetrics[];
  summary: LoansSummary;
}

type FilterStatus = 'all' | 'active' | 'overdue' | 'paid_off';

function parseAmount(val: number | string | undefined): number {
  if (val === undefined || val === null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? 0 : num;
}

/**
 * Pure display component for loans list.
 * All data fetching and calculations are done server-side.
 * This component only handles rendering and user interactions.
 */
export function LoansClient({ loans, summary }: LoansClientProps): React.JSX.Element {
  const router = useRouter();
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Calculate additional stats from loans
  const stats = React.useMemo(() => {
    const activeLoans = loans.filter((l) => l.status === 'active');
    const paidOffLoans = loans.filter((l) => l.status === 'paid_off');
    const overdueLoans = loans.filter((l) => l.status === 'active' && (l.overdue_count || 0) > 0);

    const totalRemaining = activeLoans.reduce(
      (sum, l) => sum + parseAmount(l.remaining_balance),
      0
    );

    const totalPrincipal = loans.reduce((sum, l) => sum + parseAmount(l.principal), 0);

    const totalPaid = loans.reduce((sum, l) => sum + parseAmount(l.paid_principal), 0);

    const totalProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;

    const totalMonthlyPayment = activeLoans.reduce(
      (sum, l) => sum + parseAmount(l.monthly_payment),
      0
    );

    // Calculate interest metrics
    let totalInterestPaid = 0;
    let totalInterestRemaining = 0;

    for (const loan of loans) {
      const paidAmount = parseAmount(loan.paid_amount);
      const paidPrincipal = parseAmount(loan.paid_principal);
      totalInterestPaid += Math.max(0, paidAmount - paidPrincipal);
      totalInterestRemaining +=
        parseAmount(loan.total_interest) - Math.max(0, paidAmount - paidPrincipal);
    }

    // Find next payment
    type NextPaymentType = {
      date: string;
      amount: number;
      lender: string;
      loanName: string | null;
      daysUntil: number;
      loanId: string;
    };

    let nextPayment: NextPaymentType | null = null;

    for (const loan of activeLoans) {
      if (loan.next_installment) {
        const ni = loan.next_installment;
        if (!nextPayment || ni.days_until < nextPayment.daysUntil) {
          nextPayment = {
            date: ni.due_date,
            amount: parseAmount(ni.total_due),
            lender: loan.lender,
            loanName: loan.name,
            daysUntil: ni.days_until,
            loanId: loan.id,
          };
        }
      }
    }

    return {
      activeLoans,
      paidOffLoans,
      overdueLoans,
      totalRemaining,
      totalPrincipal,
      totalPaid,
      totalProgress,
      totalMonthlyPayment,
      totalInterestPaid: Math.max(0, totalInterestPaid),
      totalInterestRemaining: Math.max(0, totalInterestRemaining),
      nextPayment,
    };
  }, [loans]);

  // Filter loans
  const filteredLoans = React.useMemo(() => {
    let result = [...loans];

    // Filter by status
    if (filterStatus === 'active') {
      result = result.filter((loan) => loan.status === 'active');
    } else if (filterStatus === 'paid_off') {
      result = result.filter((loan) => loan.status === 'paid_off');
    } else if (filterStatus === 'overdue') {
      result = result.filter((loan) => loan.status === 'active' && (loan.overdue_count || 0) > 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (loan) =>
          loan.name?.toLowerCase().includes(query) ||
          loan.lender.toLowerCase().includes(query) ||
          loan.linked_asset_name?.toLowerCase().includes(query) ||
          loan.linked_asset_license_plate?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [loans, filterStatus, searchQuery]);

  // Filter options with counts
  const filterOptions: SegmentOption<FilterStatus>[] = [
    { value: 'all', label: 'Všetky', count: loans.length },
    { value: 'active', label: 'Aktívne', count: stats.activeLoans.length },
    { value: 'overdue', label: 'Dlžné', count: stats.overdueLoans.length },
    { value: 'paid_off', label: 'Hotové', count: stats.paidOffLoans.length },
  ];

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
      {/* Hero Card - Mobile & Desktop */}
      <LoanHeroCard
        totalBalance={stats.totalRemaining}
        totalPrincipal={stats.totalPrincipal}
        activeCount={stats.activeLoans.length}
        overdueCount={summary.overdueCount}
        paidOffCount={stats.paidOffLoans.length}
        totalProgress={stats.totalProgress}
        totalMonthlyPayment={stats.totalMonthlyPayment}
        totalInterestPaid={stats.totalInterestPaid}
        totalInterestRemaining={stats.totalInterestRemaining}
        nextPayment={stats.nextPayment}
      />

      {/* Alerts - Desktop Only (already in hero card for mobile) */}
      {summary.overdueCount > 0 && (
        <div className="hidden md:block bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <div className="shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                URGENTNÉ: {summary.overdueCount}{' '}
                {summary.overdueCount === 1 ? 'splátka' : 'splátky'} po splatnosti!
              </h3>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                Prosím uhraďte omeškané splátky čo najskôr, aby ste sa vyhli ďalším poplatkom.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        {/* Segment Control */}
        <div className="overflow-x-auto pb-1">
          <SegmentControl options={filterOptions} value={filterStatus} onChange={setFilterStatus} />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Hľadať úver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredLoans.length}{' '}
          {filteredLoans.length === 1 ? 'úver' : filteredLoans.length < 5 ? 'úvery' : 'úverov'}
          {searchQuery && ` pre "${searchQuery}"`}
        </div>
      </div>

      {/* Loans List - Card View for Mobile, Table for Desktop */}
      {filteredLoans.length > 0 ? (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredLoans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </div>

          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle>Prehľad úverov</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Úver</th>
                      <th className="text-left p-2">Naviazané</th>
                      <th className="text-right p-2">
                        Suma
                        <br />
                        <span className="text-xs font-normal text-muted-foreground">
                          Pôv → Zost
                        </span>
                      </th>
                      <th className="text-right p-2">
                        Splátka mesačne
                        <br />
                        <span className="text-xs font-normal text-muted-foreground">
                          Celkom (Ist/Úrok)
                        </span>
                      </th>
                      <th className="text-left p-2">Splatené</th>
                      <th className="text-center p-2">Ďalšia</th>
                      <th className="text-center p-2">Akcie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLoans.map((loan) => {
                      const progress =
                        loan.total_installments > 0
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
                          <td className="p-2">
                            {loan.linked_asset_id ? (
                              <Link
                                href={
                                  loan.linked_asset_kind === 'real_estate'
                                    ? `/dashboard/real-estate/${loan.linked_asset_id}`
                                    : `/dashboard/vehicles/${loan.linked_asset_id}`
                                }
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <span className="inline-flex items-center gap-1">
                                  {loan.linked_asset_kind === 'real_estate' ? '🏠' : '🚗'}
                                  {loan.linked_asset_license_plate ||
                                    loan.linked_asset_name ||
                                    'Naviazané'}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="text-right p-2">
                            <div className="font-medium">
                              {formatCurrency(loan.principal)} →{' '}
                              {formatCurrency(loan.current_balance)}
                            </div>
                          </td>
                          <td className="text-right p-2">
                            <div className="font-medium">
                              {formatCurrency(monthlyPayment.toFixed(2))}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ({formatCurrency(principalDue.toFixed(2))}/
                              {formatCurrency(interestDue.toFixed(2))})
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
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
                          <td className={cn('text-center p-2', nextClass)}>
                            <div>
                              {nextStatus} {nextText}
                            </div>
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
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? 'Žiadne výsledky' : 'Žiadne úvery'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? 'Skúste zmeniť vyhľadávanie alebo filter'
                : filterStatus !== 'all'
                  ? `Nemáte žiadne ${filterStatus === 'active' ? 'aktívne' : filterStatus === 'paid_off' ? 'splatené' : 'omeškané'} úvery`
                  : 'Zatiaľ nemáte vytvorený žiadny úver'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Link href="/dashboard/loans/new">
                <Button>Pridať prvý úver</Button>
              </Link>
            )}
            {(searchQuery || filterStatus !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setFilterStatus('all');
                }}
              >
                Zrušiť filtre
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
