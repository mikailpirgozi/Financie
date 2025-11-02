import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MonthlyDashboardData } from '@finapp/core';
import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthlyTableProps {
  data: MonthlyDashboardData[];
}

export function MonthlyTable({ data }: MonthlyTableProps): React.JSX.Element {
  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    return `${monthNum}/${year.slice(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Mesačný prehľad</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Mesiac</TableHead>
                <TableHead className="text-right">Príjmy</TableHead>
                <TableHead className="text-right">Výdaje</TableHead>
                <TableHead className="text-right">Bilancia</TableHead>
                <TableHead className="text-right">Splátky celkom</TableHead>
                <TableHead className="text-right">Istina úverov</TableHead>
                <TableHead className="text-right">Majetok (brutto)</TableHead>
                <TableHead className="text-right">Čistá hodnota</TableHead>
                <TableHead className="text-right">Zmena</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const netCashFlow = parseFloat(row.netCashFlow);
                const netWorthChange = parseFloat(row.netWorthChange);
                const isPositiveCashFlow = netCashFlow > 0;
                const isNegativeCashFlow = netCashFlow < 0;
                const isPositiveChange = netWorthChange > 0;
                const isNegativeChange = netWorthChange < 0;

                return (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{formatMonth(row.month)}</TableCell>
                    <TableCell className="text-right text-green-600 font-semibold">
                      {formatCurrency(row.totalIncome)}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">
                      {formatCurrency(row.totalExpenses)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-semibold',
                        isPositiveCashFlow && 'text-green-600',
                        isNegativeCashFlow && 'text-red-600'
                      )}
                    >
                      {isPositiveCashFlow && '+'}
                      {formatCurrency(row.netCashFlow)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.loanPaymentsTotal)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.loanPrincipalPaid)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.totalAssets)}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(row.netWorth)}
                    </TableCell>
                    <TableCell className="text-right">
                      {netWorthChange !== 0 && (
                        <div
                          className={cn(
                            'flex items-center justify-end font-medium',
                            isPositiveChange && 'text-green-600',
                            isNegativeChange && 'text-red-600'
                          )}
                        >
                          {isPositiveChange && <ArrowUpIcon className="h-3 w-3 mr-1" />}
                          {isNegativeChange && <ArrowDownIcon className="h-3 w-3 mr-1" />}
                          {isPositiveChange && '+'}
                          {formatCurrency(Math.abs(netWorthChange).toString())}
                        </div>
                      )}
                      {netWorthChange === 0 && <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

