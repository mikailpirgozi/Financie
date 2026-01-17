'use client';

import { Wallet } from 'lucide-react';
import { QuickStatusCard } from './QuickStatusCard';
import { cn } from '@/lib/utils';

interface NextPayment {
  date: string;
  amount: number;
  lender: string;
  loanName: string | null;
  daysUntil: number;
  loanId: string;
}

interface LoansQuickStatusProps {
  totalDebt: number;
  activeCount: number;
  overdueCount: number;
  nextPayment: NextPayment | null;
  totalProgress: number;
  className?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'short',
  });
}

export function LoansQuickStatus({
  totalDebt,
  activeCount,
  overdueCount,
  nextPayment,
  totalProgress,
  className,
}: LoansQuickStatusProps): React.JSX.Element {
  const badge = overdueCount > 0
    ? {
        text: `${overdueCount} omesk.`,
        variant: 'danger' as const,
      }
    : undefined;

  const metrics = [
    {
      label: 'Aktívne úvery',
      value: activeCount.toString(),
    },
    {
      label: 'Splatené',
      value: `${totalProgress.toFixed(0)}%`,
      color: 'success' as const,
    },
  ];

  const footer = nextPayment
    ? {
        label: `Splátka (${formatDate(nextPayment.date)})`,
        value: formatCurrency(nextPayment.amount),
        highlight: nextPayment.daysUntil <= 5,
      }
    : undefined;

  return (
    <div className={className}>
      <QuickStatusCard
        title="Úvery"
        icon={<Wallet className="h-5 w-5 text-primary" />}
        mainValue={formatCurrency(totalDebt)}
        mainLabel="Zostávajúci dlh"
        badge={badge}
        metrics={metrics}
        footer={footer}
        href="/dashboard/loans"
      />
      {/* Progress Bar */}
      {totalProgress > 0 && (
        <div className="-mt-2 px-4 pb-2">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                'bg-green-500 dark:bg-green-400'
              )}
              style={{ width: `${Math.min(totalProgress, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
