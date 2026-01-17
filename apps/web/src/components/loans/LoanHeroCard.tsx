'use client';

import * as React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Wallet,
  Calendar,
  TrendingUp,
  CreditCard,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface NextPaymentInfo {
  date: string;
  amount: number;
  lender: string;
  loanName?: string | null;
  daysUntil: number;
  loanId: string;
}

interface LoanHeroCardProps {
  totalBalance: number;
  totalPrincipal: number;
  activeCount: number;
  overdueCount: number;
  paidOffCount: number;
  totalProgress: number;
  totalMonthlyPayment: number;
  totalInterestPaid: number;
  totalInterestRemaining: number;
  nextPayment: NextPaymentInfo | null;
  className?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'short',
  });
}

function getDaysUntilLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} dní po splatnosti`;
  if (days === 0) return 'Dnes';
  if (days === 1) return 'Zajtra';
  if (days <= 7) return `Za ${days} dní`;
  return `Za ${days} dní`;
}

export function LoanHeroCard({
  totalBalance,
  totalPrincipal,
  activeCount,
  overdueCount,
  paidOffCount,
  totalProgress,
  totalMonthlyPayment,
  totalInterestPaid,
  totalInterestRemaining,
  nextPayment,
  className,
}: LoanHeroCardProps) {
  const [progressAnimated, setProgressAnimated] = React.useState(0);

  // Animate progress on mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setProgressAnimated(totalProgress);
    }, 100);
    return () => clearTimeout(timer);
  }, [totalProgress]);

  const getDaysUntilColor = (days: number) => {
    if (days < 0) return 'text-red-600 dark:text-red-400';
    if (days === 0) return 'text-orange-600 dark:text-orange-400';
    if (days <= 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getNextPaymentBgColor = (days: number) => {
    if (days < 0) return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900';
    if (days <= 3) return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900';
    return 'bg-muted/50 border-border';
  };

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-5 shadow-sm',
        className
      )}
    >
      {/* Main Balance */}
      <div className="text-center mb-4">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
          Celkový zostatok
        </div>
        <div className="text-4xl font-bold tracking-tight text-foreground">
          {formatCurrency(totalBalance)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          z {formatCurrency(totalPrincipal)} požičaných
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-muted-foreground">Celkový pokrok</span>
          <span className="font-semibold text-primary">
            {Math.round(totalProgress)}%
          </span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressAnimated}%` }}
          />
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Wallet className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary">
            {activeCount} aktívnych
          </span>
        </div>
        {overdueCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-900">
            <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">
              {overdueCount} po splatnosti
            </span>
          </div>
        )}
        {paidOffCount > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-950/50 border border-green-200 dark:border-green-900">
            <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
              {paidOffCount} splatených
            </span>
          </div>
        )}
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2 py-3 border-t border-b mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {formatCurrency(totalMonthlyPayment)}
            </div>
            <div className="text-[10px] text-muted-foreground">mesačne</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {formatCurrency(totalInterestPaid)}
            </div>
            <div className="text-[10px] text-muted-foreground">úrok zaplatený</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">
              {formatCurrency(totalInterestRemaining)}
            </div>
            <div className="text-[10px] text-muted-foreground">úrok zostáva</div>
          </div>
        </div>
      </div>

      {/* Next Payment Section */}
      {nextPayment && (
        <Link
          href={`/dashboard/loans/${nextPayment.loanId}`}
          className={cn(
            'block rounded-xl p-3 border transition-all hover:shadow-sm',
            getNextPaymentBgColor(nextPayment.daysUntil)
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/50 dark:bg-black/20">
              <Calendar
                className={cn('h-5 w-5', getDaysUntilColor(nextPayment.daysUntil))}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Najbližšia splátka
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {formatCurrency(nextPayment.amount)}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                    nextPayment.daysUntil < 0 
                      ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                      : nextPayment.daysUntil <= 3
                        ? 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300'
                        : 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                  )}
                >
                  {getDaysUntilLabel(nextPayment.daysUntil)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {nextPayment.loanName || nextPayment.lender} • {formatDate(nextPayment.date)}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>

          {/* Quick Pay Button */}
          <Link
            href={`/dashboard/loans/${nextPayment.loanId}`}
            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <CreditCard className="h-4 w-4" />
            Zobraziť detail
          </Link>
        </Link>
      )}
    </div>
  );
}
