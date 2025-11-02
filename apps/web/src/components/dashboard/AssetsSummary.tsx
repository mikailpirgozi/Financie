import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import type { MonthlyDashboardData } from '@finapp/core';
import { cn } from '@/lib/utils';

interface AssetsSummaryProps {
  data: MonthlyDashboardData;
}

export function AssetsSummary({ data }: AssetsSummaryProps): React.JSX.Element {
  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(value));
  };

  const netWorthChange = parseFloat(data.netWorthChange);
  const isPositive = netWorthChange > 0;
  const isNegative = netWorthChange < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">🏠 Majetok</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Celkový majetok</p>
          <p className="text-xl font-bold">{formatCurrency(data.totalAssets)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Zostatok úverov</p>
          <p className="text-lg font-semibold">{formatCurrency(data.loanBalanceRemaining)}</p>
        </div>
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">Čistá hodnota</p>
          <p className="text-2xl font-bold">{formatCurrency(data.netWorth)}</p>
          {netWorthChange !== 0 && (
            <div
              className={cn(
                'flex items-center text-sm font-medium mt-1',
                isPositive && 'text-green-600',
                isNegative && 'text-red-600'
              )}
            >
              {isPositive && <ArrowUpIcon className="h-4 w-4 mr-1" />}
              {isNegative && <ArrowDownIcon className="h-4 w-4 mr-1" />}
              {formatCurrency(Math.abs(netWorthChange).toString())}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

