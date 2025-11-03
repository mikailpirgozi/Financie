'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AssetROI } from '@finapp/core';
import { TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

interface AssetMetricsCardProps {
  assetName: string;
  assetValue: number;
  loanBalance?: number;
  ltv?: number;
  equity?: number;
  netMonthlyCashFlow?: number;
  roi?: AssetROI;
  linkedLoan?: {
    lender: string;
    monthlyPayment: number;
  };
}

export function AssetMetricsCard({
  assetName,
  assetValue,
  loanBalance = 0,
  ltv = 0,
  equity = 0,
  netMonthlyCashFlow = 0,
  roi,
  linkedLoan,
}: AssetMetricsCardProps): React.JSX.Element {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getLTVBadge = (ltvValue: number) => {
    if (ltvValue < 60) return { variant: 'default' as const, label: 'Výborné', color: '#10b981' };
    if (ltvValue < 80) return { variant: 'secondary' as const, label: 'Dobré', color: '#f59e0b' };
    if (ltvValue < 90) return { variant: 'destructive' as const, label: 'Vysoké', color: '#fb923c' };
    return { variant: 'destructive' as const, label: 'Kritické', color: '#ef4444' };
  };

  const ltvBadge = getLTVBadge(ltv);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{assetName}</span>
          <span className="text-2xl font-bold text-amber-600">
            {formatCurrency(assetValue)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prepojený úver */}
        {linkedLoan && (
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">💳 Prepojený úver</h3>
              <Badge variant="outline">{linkedLoan.lender}</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Zostatok úveru</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(loanBalance)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mesačná splátka</span>
                <span className="text-sm font-medium">
                  {formatCurrency(linkedLoan.monthlyPayment)}
                </span>
              </div>
            </div>

            {/* LTV Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">LTV (Loan-to-Value)</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" style={{ color: ltvBadge.color }}>
                    {ltv.toFixed(1)}%
                  </span>
                  <Badge variant={ltvBadge.variant}>{ltvBadge.label}</Badge>
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(ltv, 100)}%`,
                    backgroundColor: ltvBadge.color,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {ltv < 60 && 'Výborný pomer vlastného a cudzieho kapitálu'}
                {ltv >= 60 && ltv < 80 && 'Dobrý pomer, bežný pri hypotékach'}
                {ltv >= 80 && ltv < 90 && 'Vysoké zadlženie, zvážte zvýšenie equity'}
                {ltv >= 90 && 'Kritické zadlženie! Potrebné znížiť dlh'}
              </p>
            </div>

            {/* Equity */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Vlastný podiel (Equity)</span>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(equity)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {((equity / assetValue) * 100).toFixed(1)}% z hodnoty majetku
            </p>
          </div>
        )}

        {/* Cash Flow */}
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="text-sm font-semibold">💰 Mesačný Cash Flow</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Čistý cash flow</span>
            <span 
              className="text-lg font-bold"
              style={{ color: netMonthlyCashFlow >= 0 ? '#10b981' : '#ef4444' }}
            >
              {netMonthlyCashFlow >= 0 ? '+' : ''}{formatCurrency(netMonthlyCashFlow)}
            </span>
          </div>
          {netMonthlyCashFlow < 0 && (
            <p className="text-xs text-red-600">
              ⚠️ Majetok generuje negatívny cash flow
            </p>
          )}
          {netMonthlyCashFlow > 0 && (
            <p className="text-xs text-green-600">
              ✅ Majetok je cash flow pozitívny
            </p>
          )}
        </div>

        {/* ROI */}
        {roi && (
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="text-sm font-semibold">📈 Return on Investment</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  {roi.cashFlowRoi >= 0 ? (
                    <TrendingUpIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDownIcon className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: roi.cashFlowRoi >= 0 ? '#10b981' : '#ef4444' }}
                >
                  {formatPercentage(roi.cashFlowRoi)}
                </div>
                <p className="text-xs text-muted-foreground">Cash Flow ROI</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  {roi.appreciationRoi >= 0 ? (
                    <TrendingUpIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDownIcon className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: roi.appreciationRoi >= 0 ? '#10b981' : '#ef4444' }}
                >
                  {formatPercentage(roi.appreciationRoi)}
                </div>
                <p className="text-xs text-muted-foreground">Zhodnotenie</p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  {roi.totalRoi >= 0 ? (
                    <TrendingUpIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDownIcon className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div 
                  className="text-lg font-bold"
                  style={{ color: roi.totalRoi >= 0 ? '#10b981' : '#ef4444' }}
                >
                  {formatPercentage(roi.totalRoi)}
                </div>
                <p className="text-xs text-muted-foreground">Celkový ROI</p>
              </div>
            </div>

            <div className="pt-3 border-t space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Celkový príjem</span>
                <span className="font-medium text-green-600">
                  +{formatCurrency(roi.totalIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Celkové výdavky</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(roi.totalExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Zhodnotenie</span>
                <span 
                  className="font-medium"
                  style={{ color: roi.valueChange >= 0 ? '#10b981' : '#ef4444' }}
                >
                  {roi.valueChange >= 0 ? '+' : ''}{formatCurrency(roi.valueChange)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

