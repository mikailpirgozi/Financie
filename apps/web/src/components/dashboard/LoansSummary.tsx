import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlyDashboardData } from '@finapp/core';

interface LoansSummaryProps {
  data: MonthlyDashboardData;
}

export function LoansSummary({ data }: LoansSummaryProps) {
  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(value));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">🏦 Úvery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Splatené tento mesiac</p>
          <p className="text-xl font-bold">{formatCurrency(data.loanPaymentsTotal)}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">→ Istina</p>
            <p className="font-semibold">{formatCurrency(data.loanPrincipalPaid)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">→ Úrok</p>
            <p className="font-semibold">{formatCurrency(data.loanInterestPaid)}</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">Zostávajúci dlh</p>
          <p className="text-xl font-bold">{formatCurrency(data.loanBalanceRemaining)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

