'use client';

import * as React from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinanceSummaryCollapsibleProps {
  netWorth: number;
  netWorthChange: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  month: string;
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

export function FinanceSummaryCollapsible({
  netWorth,
  netWorthChange,
  totalIncome,
  totalExpenses,
  netCashFlow,
  month,
  className,
}: FinanceSummaryCollapsibleProps) {
  const [expanded, setExpanded] = React.useState(false);

  const isPositiveChange = netWorthChange > 0;
  const isPositiveCashFlow = netCashFlow > 0;

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header - Always Visible */}
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-0.5">
              Čistá hodnota
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-foreground">
                {formatCurrency(netWorth)}
              </span>
              {netWorthChange !== 0 && (
                <div className="flex items-center gap-1">
                  {isPositiveChange ? (
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span
                    className={cn(
                      'text-xs font-semibold',
                      isPositiveChange ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {isPositiveChange ? '+' : ''}
                    {formatCurrency(netWorthChange)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-primary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t px-4 pb-4 pt-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  Príjmy ({month})
                </div>
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(totalIncome)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">
                  Výdavky ({month})
                </div>
                <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {formatCurrency(totalExpenses)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Bilancia</div>
                <div
                  className={cn(
                    'text-sm font-semibold',
                    isPositiveCashFlow
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {isPositiveCashFlow ? '+' : ''}
                  {formatCurrency(netCashFlow)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
