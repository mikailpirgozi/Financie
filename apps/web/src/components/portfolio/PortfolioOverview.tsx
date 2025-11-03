'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import type { PortfolioOverview } from '@finapp/core';
import { TrendingUpIcon, TrendingDownIcon, HomeIcon } from 'lucide-react';

interface PortfolioOverviewProps {
  data: PortfolioOverview;
}

export function PortfolioOverviewCard({ data }: PortfolioOverviewProps): React.JSX.Element {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const debtRatioColor = data.debtToAssetRatio < 50 ? '#10b981' : data.debtToAssetRatio < 75 ? '#f59e0b' : '#ef4444';
  const cashFlowColor = data.totalMonthlyCashFlow >= 0 ? '#10b981' : '#ef4444';

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Čistá hodnota</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.netWorth)}</div>
            <p className="text-xs text-muted-foreground">majetok - dlhy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zadlženie</CardTitle>
            <div className="h-4 w-4" style={{ color: debtRatioColor }}>●</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: debtRatioColor }}>
              {formatPercentage(data.debtToAssetRatio)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.totalDebt)} z {formatCurrency(data.totalAssetsValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mesačný cash flow</CardTitle>
            {data.totalMonthlyCashFlow >= 0 ? (
              <TrendingUpIcon className="h-4 w-4" style={{ color: cashFlowColor }} />
            ) : (
              <TrendingDownIcon className="h-4 w-4" style={{ color: cashFlowColor }} />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: cashFlowColor }}>
              {formatCurrency(data.totalMonthlyCashFlow)}
            </div>
            <p className="text-xs text-muted-foreground">
              príjmy - výdavky - splátky
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfólio</CardTitle>
            <HomeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAssetsCount}</div>
            <p className="text-xs text-muted-foreground">
              majetkov • {data.totalLoansCount} úverov
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Assets Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>🏠 Majetky</CardTitle>
            <CardDescription>Rozdelenie portfólia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Celková hodnota</span>
                <span className="text-lg font-bold text-amber-600">
                  {formatCurrency(data.totalAssetsValue)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    🟢 Produktívne ({data.productiveAssetsCount})
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(data.productiveAssetsValue)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${(data.productiveAssetsValue / data.totalAssetsValue * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mesačný CF: {formatCurrency(data.netCashFlowFromAssets)}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    🔴 Neproduktívne ({data.totalAssetsCount - data.productiveAssetsCount})
                  </span>
                  <span className="text-sm font-medium">
                    {formatCurrency(data.nonProductiveAssetsValue)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gray-400"
                    style={{
                      width: `${(data.nonProductiveAssetsValue / data.totalAssetsValue * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loans & Cash Flow */}
        <Card>
          <CardHeader>
            <CardTitle>💳 Úvery & Cash Flow</CardTitle>
            <CardDescription>Mesačné splátky a príjmy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Celkové zadlženie</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(data.totalDebt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mesačné splátky</span>
                <span className="text-sm font-medium text-red-600">
                  -{formatCurrency(data.nextMonthLoanPayment)}
                </span>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Príjmy z majetkov</span>
                <span className="text-sm font-medium text-green-600">
                  +{formatCurrency(data.monthlyIncomeFromAssets)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Náklady majetkov</span>
                <span className="text-sm font-medium text-red-600">
                  -{formatCurrency(data.monthlyExpensesFromAssets)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Splátky úverov</span>
                <span className="text-sm font-medium text-red-600">
                  -{formatCurrency(data.nextMonthLoanPayment)}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Čistý mesačný CF</span>
                <span 
                  className="text-lg font-bold"
                  style={{ color: cashFlowColor }}
                >
                  {formatCurrency(data.totalMonthlyCashFlow)}
                </span>
              </div>
              {data.totalMonthlyCashFlow < 0 && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ Negatívny cash flow! Príjmy nepokrývajú výdavky.
                </p>
              )}
              {data.totalMonthlyCashFlow >= 0 && data.totalMonthlyCashFlow < 500 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Tesný cash flow. Odporúčame monitorovať výdavky.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

