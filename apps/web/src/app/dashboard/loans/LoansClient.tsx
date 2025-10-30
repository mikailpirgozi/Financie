'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@finapp/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@finapp/ui';
import { DeleteDialog } from '@/components/DeleteDialog';
import { useEffect, useState } from 'react';

interface Loan {
  id: string;
  lender: string;
  loan_type: string;
  principal: number;
  annual_rate: number;
  status: string;
  start_date: string;
  term_months: number;
}

interface LoanSchedule {
  id: string;
  loan_id: string;
  installment_no: number;
  due_date: string;
  principal_due: number;
  interest_due: number;
  fees_due: number;
  total_due: number;
  principal_balance_after: number;
  status: string;
  paid_at: string | null;
}

interface LoanWithSchedule extends Loan {
  schedule: LoanSchedule[];
}

interface LoansClientProps {
  loans: Loan[];
}

export function LoansClient({ loans }: LoansClientProps) {
  const router = useRouter();
  const [loansWithSchedule, setLoansWithSchedule] = useState<LoanWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchedules() {
      const loansWithScheduleData = await Promise.all(
        loans.map(async (loan) => {
          const response = await fetch(`/api/loans/${loan.id}/schedule`);
          if (response.ok) {
            const data = await response.json();
            // API returns { schedule: [...], count: ..., pages: ..., metrics: ... }
            return { ...loan, schedule: data.schedule || [] };
          }
          return { ...loan, schedule: [] };
        })
      );
      setLoansWithSchedule(loansWithScheduleData);
      setLoading(false);
    }

    fetchSchedules();
  }, [loans]);

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/loans/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Nepodarilo sa zmazať úver');
    }

    router.refresh();
  };

  // Calculate summary statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalBalance = 0;
  let totalMonthlyPayment = 0;
  let totalPaid = 0;
  let totalOriginal = 0;
  let overdueCount = 0;
  let dueSoonCount = 0;
  
  type NextPayment = { date: Date; amount: number; lender: string };
  let nextPayment: NextPayment | null = null;

  loansWithSchedule.forEach((loan) => {
    totalOriginal += Number(loan.principal);

    const paidSchedules = loan.schedule.filter((s) => s.status === 'paid');
    const lastPaid = paidSchedules[paidSchedules.length - 1];
    const currentBalance = lastPaid
      ? Number(lastPaid.principal_balance_after)
      : Number(loan.principal);

    totalBalance += currentBalance;
    totalPaid += paidSchedules.reduce((sum, s) => sum + Number(s.total_due), 0);

    // For monthly payment and next payment, use next unpaid installment (especially important for fixed_principal)
    const nextInstallment = loan.schedule.find(
      (s) => s.status === 'pending' || s.status === 'overdue'
    );
    if (nextInstallment) {
      totalMonthlyPayment += Number(nextInstallment.total_due);
      
      // Find next payment
      const dueDate = new Date(nextInstallment.due_date);
      if (!nextPayment || dueDate < nextPayment.date) {
        nextPayment = {
          date: dueDate,
          amount: Number(nextInstallment.total_due),
          lender: loan.lender,
        };
      }
    }

    // Count overdue and due soon
    loan.schedule.forEach((s) => {
      if (s.status === 'paid') return;

      const dueDate = new Date(s.due_date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today) {
        overdueCount++;
      } else {
        const dueSoonDate = new Date(today);
        dueSoonDate.setDate(dueSoonDate.getDate() + 7);
        if (dueDate <= dueSoonDate) {
          dueSoonCount++;
        }
      }
    });
  });

  const totalSplatene = totalOriginal > 0 ? ((totalPaid / (totalOriginal + totalPaid)) * 100) : 0;
  const daysUntilNext: number | null = nextPayment !== null
    ? Math.ceil(((nextPayment as NextPayment).date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return <div className="text-center py-12">Načítavam údaje...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Mini Widget */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">💰 Zostatok:</span>
              <span className="font-bold">{totalBalance.toFixed(2)} €</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">📅 Mesačne:</span>
              <span className="font-bold">{totalMonthlyPayment.toFixed(2)} €</span>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <span className="font-medium">⚠️ {overdueCount} omeškané</span>
              </div>
            )}
            {dueSoonCount > 0 && overdueCount === 0 && (
              <div className="flex items-center gap-2 text-orange-600">
                <span className="font-medium">🔔 {dueSoonCount} čoskoro</span>
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
            <div className="text-2xl font-bold">{totalBalance.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground mt-1">
              z {loansWithSchedule.length} {loansWithSchedule.length === 1 ? 'úveru' : 'úverov'}
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
            <div className="text-2xl font-bold">{totalMonthlyPayment.toFixed(2)} €</div>
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
            <div className="text-2xl font-bold">{totalSplatene.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPaid.toFixed(0)} € ✅
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
            {nextPayment ? (
              <>
                <div className="text-2xl font-bold">
                  {(nextPayment as NextPayment).date.toLocaleDateString('sk-SK', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {(nextPayment as NextPayment).amount.toFixed(0)} € (
                  {daysUntilNext !== null && daysUntilNext < 0
                    ? `${Math.abs(daysUntilNext)} dní po splatnosti`
                    : daysUntilNext === 0
                    ? 'dnes'
                    : `o ${daysUntilNext} dní`}
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
      {overdueCount > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                URGENTNÉ: {overdueCount} {overdueCount === 1 ? 'splátka' : 'splátky'} po splatnosti!
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
            <div className="flex-shrink-0">
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
                {loansWithSchedule.map((loan) => {
                  const paidSchedules = loan.schedule.filter((s) => s.status === 'paid');
                  const lastPaid = paidSchedules[paidSchedules.length - 1];
                  const currentBalance = lastPaid
                    ? Number(lastPaid.principal_balance_after)
                    : Number(loan.principal);

                  const nextInstallment = loan.schedule.find(
                    (s) => s.status === 'pending' || s.status === 'overdue'
                  );

                  // Use next installment for monthly payment (important for fixed_principal with decreasing payments)
                  const monthlyPayment = nextInstallment ? Number(nextInstallment.total_due) : 0;
                  const principalDue = nextInstallment ? Number(nextInstallment.principal_due) : 0;
                  const interestDue = nextInstallment ? Number(nextInstallment.interest_due) : 0;

                  const progress = loan.schedule.length > 0
                    ? (paidSchedules.length / loan.schedule.length) * 100
                    : 0;

                  let nextStatus = '✅';
                  let nextText = 'OK';
                  let nextClass = '';

                  if (nextInstallment) {
                    const dueDate = new Date(nextInstallment.due_date);
                    dueDate.setHours(0, 0, 0, 0);
                    const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

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

                  return (
                    <tr key={loan.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        <div className="font-medium">{loan.lender}</div>
                        <div className="text-xs text-muted-foreground">
                          {loan.loan_type === 'annuity' && 'Anuitný'}
                          {loan.loan_type === 'fixed_principal' && 'Fixná istina'}
                          {loan.loan_type === 'interest_only' && 'Len úrok'}
                        </div>
                      </td>
                      <td className="text-right p-2">
                        <div className="font-medium">
                          {Number(loan.principal).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → {currentBalance.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </div>
                      </td>
                      <td className="text-right p-2">
                        <div className="font-medium">{monthlyPayment.toFixed(2)} €</div>
                        <div className="text-xs text-muted-foreground">
                          ({principalDue.toFixed(2)}€/{interestDue.toFixed(2)}€)
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
                          {paidSchedules.length}/{loan.schedule.length} splátok
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
                            description={`Naozaj chcete zmazať úver "${loan.lender}"?`}
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
