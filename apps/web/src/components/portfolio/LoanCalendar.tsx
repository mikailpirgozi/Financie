'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { MonthlyLoanCalendar } from '@finapp/core';
import { useState } from 'react';

interface LoanCalendarProps {
  calendar: MonthlyLoanCalendar[];
  summary: {
    totalMonths: number;
    totalPayments: number;
    totalPrincipal: number;
    totalInterest: number;
    totalFees: number;
  };
}

const LOAN_TYPE_ICONS: Record<string, string> = {
  annuity: '🏠',
  fixed_principal: '📊',
  interest_only: '💼',
  auto_loan: '🚗',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#f59e0b',
  paid: '#10b981',
  overdue: '#ef4444',
};

export function LoanCalendar({ calendar, summary }: LoanCalendarProps): React.JSX.Element {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set([calendar[0]?.month]));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('sk-SK', { year: 'numeric', month: 'long' });
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedMonths(new Set(calendar.map(m => m.month)));
  };

  const collapseAll = () => {
    setExpandedMonths(new Set([calendar[0]?.month]));
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📅 Splátkový kalendár</CardTitle>
              <CardDescription>Najbližších {summary.totalMonths} mesiacov</CardDescription>
            </div>
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="text-xs px-3 py-1 rounded-md border hover:bg-gray-100"
              >
                Rozbaliť všetko
              </button>
              <button
                onClick={collapseAll}
                className="text-xs px-3 py-1 rounded-md border hover:bg-gray-100"
              >
                Zbaliť všetko
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalPayments)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Celkové splátky</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.totalPrincipal)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Istina</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(summary.totalInterest)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Úroky</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {formatCurrency(summary.totalFees)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Poplatky</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Calendar */}
      <div className="space-y-4">
        {calendar.map((monthData) => {
          const isExpanded = expandedMonths.has(monthData.month);
          const isCurrentMonth = monthData.month === new Date().toISOString().slice(0, 7);

          return (
            <Card 
              key={monthData.month}
              className={isCurrentMonth ? 'border-blue-500 border-2' : ''}
            >
              <CardHeader className="cursor-pointer" onClick={() => toggleMonth(monthData.month)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {formatMonth(monthData.month)}
                        {isCurrentMonth && (
                          <Badge variant="default">Aktuálny mesiac</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {monthData.entries.length} {monthData.entries.length === 1 ? 'splátka' : 'splátky'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(monthData.totalPayments)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Istina: {formatCurrency(monthData.totalPrincipal)} • 
                      Úroky: {formatCurrency(monthData.totalInterest)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  <div className="space-y-3">
                    {monthData.entries.map((entry) => (
                      <div 
                        key={`${entry.loanId}-${entry.installmentNo}`}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-2xl">
                            {LOAN_TYPE_ICONS[entry.loanType] || '💰'}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{entry.loanName}</span>
                              <Badge 
                                variant="outline"
                                style={{ 
                                  borderColor: STATUS_COLORS[entry.status],
                                  color: STATUS_COLORS[entry.status],
                                }}
                              >
                                {entry.status === 'paid' ? 'Zaplatené' : 
                                 entry.status === 'overdue' ? 'Po splatnosti' : 'Čaká'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>
                                {new Date(entry.dueDate).toLocaleDateString('sk-SK')}
                              </span>
                              <span>•</span>
                              <span>Splátka #{entry.installmentNo}</span>
                              {entry.linkedAssetName && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    🏠 {entry.linkedAssetName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatCurrency(entry.totalDue)}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div>Istina: {formatCurrency(entry.principalDue)}</div>
                            <div>Úrok: {formatCurrency(entry.interestDue)}</div>
                            {entry.feesDue > 0 && (
                              <div>Poplatky: {formatCurrency(entry.feesDue)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Month Summary */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Celkom:</span>
                        <div className="font-semibold">{formatCurrency(monthData.totalPayments)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Istina:</span>
                        <div className="font-semibold">{formatCurrency(monthData.totalPrincipal)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Úroky:</span>
                        <div className="font-semibold">{formatCurrency(monthData.totalInterest)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Poplatky:</span>
                        <div className="font-semibold">{formatCurrency(monthData.totalFees)}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

