'use client';

import { useState } from 'react';
import { Button } from '@finapp/ui';
import { Loader2 } from 'lucide-react';
import { VirtualizedScheduleTable } from '@/components/loans/VirtualizedScheduleTable';
import { ScheduleSkeleton } from '@/components/loans/ScheduleSkeleton';
import {
  useLoanSchedule,
  usePayInstallment,
  useMarkPaidUntilToday,
  useRegenerateSchedule,
} from '@/hooks/useLoansData';

interface LoanScheduleEntry {
  id: string;
  installment_no: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  fees_due: string;
  total_due: string;
  principal_balance_after: string;
  status: string;
}

interface LoanDetailClientProps {
  loanId: string;
  schedule: LoanScheduleEntry[];
}

export function LoanDetailClient({
  loanId,
  schedule,
}: LoanDetailClientProps): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);

  // React Query hooks
  const { data, isLoading } = useLoanSchedule(loanId, 1, {
    schedule,
    count: schedule.length,
    page: 1,
    pages: 1,
    metrics: undefined,
  });

  const payMutation = usePayInstallment(loanId);
  const markPaidMutation = useMarkPaidUntilToday(loanId);
  const regenerateMutation = useRegenerateSchedule(loanId);

  const currentSchedule = data?.schedule ?? schedule;

  // Handlers s optimistic updates
  const handlePayInstallment = async (
    installmentId: string,
    amount: number
  ) => {
    if (
      !confirm(
        `Naozaj chcete uhradiť splátku vo výške ${amount.toFixed(2)} €?`
      )
    ) {
      return;
    }

    setError(null);

    try {
      await payMutation.mutateAsync({ installmentId, amount });
      alert('Splátka bola úspešne uhradená!');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Nepodarilo sa uhradiť splátku';
      setError(message);
      alert(message);
    }
  };

  const handleMarkPaidUntilToday = async () => {
    const today = new Date().toISOString().split('T')[0];

    const pendingUntilToday = currentSchedule.filter(
      (entry: LoanScheduleEntry) =>
        (entry.status === 'pending' || entry.status === 'overdue') &&
        entry.due_date <= today
    );

    if (pendingUntilToday.length === 0) {
      alert('Žiadne splátky na označenie.');
      return;
    }

    if (
      !confirm(
        `Naozaj chcete označiť ${pendingUntilToday.length} splátok ako uhradené?`
      )
    ) {
      return;
    }

    setError(null);

    try {
      await markPaidMutation.mutateAsync(today);
      alert(`${pendingUntilToday.length} splátok bolo úspešne označených!`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Nepodarilo sa označiť splátky';
      setError(message);
      alert(message);
    }
  };

  const handleRegenerateSchedule = async () => {
    if (
      !confirm('Naozaj chcete regenerovať splátkový kalendár?')
    ) {
      return;
    }

    setError(null);

    try {
      await regenerateMutation.mutateAsync();
      alert('Splátkový kalendár bol úspešne regenerovaný!');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Nepodarilo sa regenerovať kalendár';
      setError(message);
      alert(message);
    }
  };

  if (isLoading && currentSchedule.length === 0) {
    return <ScheduleSkeleton />;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {currentSchedule.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p className="font-medium">Splátkový kalendár nebol vygenerovaný</p>
          <Button
            onClick={handleRegenerateSchedule}
            disabled={regenerateMutation.isPending}
            className="mt-2"
            size="sm"
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generujem...
              </>
            ) : (
              'Vygenerovať kalendár'
            )}
          </Button>
        </div>
      )}

      {currentSchedule.length > 0 && (
        <>
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleMarkPaidUntilToday}
              disabled={markPaidMutation.isPending}
              variant="outline"
              size="sm"
            >
              {markPaidMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Označujem...
                </>
              ) : (
                '📅 Označiť splátky ako uhradené k dnešnému dátumu'
              )}
            </Button>
          </div>

          <VirtualizedScheduleTable
            schedule={currentSchedule}
            loading={payMutation.variables?.installmentId}
            onPay={handlePayInstallment}
          />
        </>
      )}
    </div>
  );
}

