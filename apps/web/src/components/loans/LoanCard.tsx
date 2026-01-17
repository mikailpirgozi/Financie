'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  AlertTriangle,
  Clock,
  Calendar,
  Hash,
  Car,
  Home,
  CreditCard,
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LoanWithMetrics } from '@/lib/api/loans';

interface LoanCardProps {
  loan: LoanWithMetrics;
  className?: string;
}

type LoanStatus = 'overdue' | 'due_soon' | 'ok' | 'paid_off';

const LOAN_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof CreditCard; shortLabel: string }
> = {
  annuity: { label: 'Anuitný', icon: CreditCard, shortLabel: 'Anuitný' },
  fixed_principal: { label: 'Fixná istina', icon: Hash, shortLabel: 'Fixný' },
  interest_only: { label: 'Interest-only', icon: Percent, shortLabel: 'IO' },
  auto_loan: { label: 'Auto úver', icon: Car, shortLabel: 'Auto' },
  mortgage: { label: 'Hypotéka', icon: Home, shortLabel: 'Hypo' },
};

function parseAmount(val: number | string | undefined): number {
  if (val === undefined || val === null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(num) ? 0 : num;
}

function formatCurrency(amount: number | string): string {
  const num = parseAmount(amount);
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDaysUntil(days: number | undefined): string | null {
  if (days === undefined) return null;
  if (days < 0) return `${Math.abs(days)}d po`;
  if (days === 0) return 'Dnes';
  if (days === 1) return 'Zajtra';
  return `${days}d`;
}

export function LoanCard({ loan, className }: LoanCardProps) {
  // Determine loan status
  const getLoanStatus = (): LoanStatus => {
    if (loan.status === 'paid_off') return 'paid_off';
    if ((loan.overdue_count || 0) > 0) return 'overdue';

    const nextInstallment = loan.next_installment;
    if (nextInstallment && nextInstallment.days_until !== undefined) {
      if (nextInstallment.days_until >= 0 && nextInstallment.days_until <= 5) {
        return 'due_soon';
      }
    }

    return 'ok';
  };

  const status = getLoanStatus();

  const getStatusColor = () => {
    switch (status) {
      case 'overdue':
        return 'bg-red-500';
      case 'due_soon':
        return 'bg-orange-500';
      case 'paid_off':
        return 'bg-green-500';
      default:
        return 'bg-primary';
    }
  };

  const getDaysUntilColor = (days: number | undefined) => {
    if (days === undefined) return 'text-muted-foreground';
    if (days < 0) return 'text-red-600 dark:text-red-400';
    if (days === 0) return 'text-orange-600 dark:text-orange-400';
    if (days <= 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const calculateProgress = (): number => {
    const principal = parseAmount(loan.principal);
    const amountPaid = parseAmount(loan.paid_principal);
    if (principal === 0) return 0;
    return (amountPaid / principal) * 100;
  };

  const progress = calculateProgress();
  const statusColor = getStatusColor();

  const nextInstallment = loan.next_installment;
  const daysUntil = nextInstallment?.days_until;
  const totalInstallments = loan.total_installments || 0;
  const paidCount = loan.paid_count || 0;
  const remainingInstallments = totalInstallments - paidCount;

  const loanTypeConfig = LOAN_TYPE_CONFIG[loan.loan_type] || {
    label: loan.loan_type,
    shortLabel: loan.loan_type,
    icon: CreditCard,
  };
  const TypeIcon = loanTypeConfig.icon;

  const annualRate = parseAmount(loan.annual_rate);

  return (
    <Link
      href={`/dashboard/loans/${loan.id}`}
      className={cn(
        'flex rounded-2xl border bg-card overflow-hidden shadow-sm transition-all',
        'hover:shadow-md hover:border-primary/30 hover:scale-[1.005]',
        'active:scale-[0.995]',
        className
      )}
    >
      {/* Status Indicator */}
      <div className={cn('w-1 shrink-0', statusColor)} />

      {/* Content */}
      <div className="flex-1 p-4">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {status === 'overdue' && (
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            {status === 'due_soon' && (
              <Clock className="h-4 w-4 text-orange-500 shrink-0" />
            )}
            <span className="font-semibold text-foreground truncate">
              {loan.name || loan.lender}
            </span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>

        {/* Subtitle with loan type and rate */}
        <div className="flex items-center gap-2 mb-3">
          {loan.name && (
            <span className="text-xs text-muted-foreground">{loan.lender}</span>
          )}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted">
            <TypeIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">
              {loanTypeConfig.shortLabel}
            </span>
          </div>
          <div className="px-2 py-0.5 rounded bg-primary/10">
            <span className="text-[10px] font-semibold text-primary">
              {annualRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Balance and Monthly Payment Row */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-xl font-bold text-foreground">
              {formatCurrency(loan.remaining_balance)}
            </div>
            <div className="text-[10px] text-muted-foreground">zostatok</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-muted-foreground">
              {formatCurrency(loan.monthly_payment)}/mes
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                status === 'paid_off' ? 'bg-green-500' : statusColor
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground min-w-8 text-right">
            {Math.round(progress)}%
          </span>
        </div>

        {/* Info Row */}
        <div className="flex items-center gap-3 mb-2">
          {nextInstallment && status !== 'paid_off' && (
            <div className="flex items-center gap-1">
              <Calendar className={cn('h-3 w-3', getDaysUntilColor(daysUntil))} />
              <span className={cn('text-xs font-medium', getDaysUntilColor(daysUntil))}>
                {formatDaysUntil(daysUntil)}
              </span>
            </div>
          )}
          {remainingInstallments > 0 && status !== 'paid_off' && (
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {remainingInstallments} spl.
              </span>
            </div>
          )}
          {status === 'paid_off' && (
            <span className="px-2 py-0.5 rounded bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 text-xs font-semibold">
              Splatený
            </span>
          )}
        </div>

        {/* Status Alert */}
        {status === 'overdue' && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
            <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
            <span className="text-xs font-medium text-red-700 dark:text-red-400">
              {loan.overdue_count} {loan.overdue_count === 1 ? 'splátka' : 'splátok'} po splatnosti
            </span>
          </div>
        )}

        {status === 'due_soon' && daysUntil !== undefined && daysUntil >= 0 && daysUntil <= 5 && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
            <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-400">
              Splatnosť {daysUntil === 0 ? 'dnes' : daysUntil === 1 ? 'zajtra' : `za ${daysUntil} dní`}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
