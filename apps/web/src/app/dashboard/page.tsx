'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { KPICard } from '@/components/dashboard/KPICard';
import { LoansSummary } from '@/components/dashboard/LoansSummary';
import { AssetsSummary } from '@/components/dashboard/AssetsSummary';
import { FinancialCharts } from '@/components/dashboard/FinancialCharts';
import { MonthlyTable } from '@/components/dashboard/MonthlyTable';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUpIcon, TrendingDownIcon, DollarSignIcon, WalletIcon } from 'lucide-react';

export default function DashboardPage(): React.JSX.Element | null {
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchHousehold = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        setHouseholdId(membership.household_id);
      }
    };

    fetchHousehold();
  }, [supabase]);

  const { data, isLoading, error } = useDashboard({
    householdId: householdId || '',
    monthsCount: 12,
  });

  if (!householdId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Vitajte v FinApp</CardTitle>
            <CardDescription>
              Zatiaľ nemáte vytvorenú domácnosť. Kontaktujte administrátora.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Chyba pri načítaní dát</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { currentMonth } = data;

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(parseFloat(value));
  };

  const calculatePercentChange = (current: string, previous: string) => {
    const curr = parseFloat(current);
    const prev = parseFloat(previous);
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  // Get previous month data for comparison
  const previousMonth = data.history.length > 1 ? data.history[1] : null;

  const incomeChange = previousMonth
    ? calculatePercentChange(currentMonth.totalIncome, previousMonth.totalIncome)
    : null;

  const expensesChange = previousMonth
    ? calculatePercentChange(currentMonth.totalExpenses, previousMonth.totalExpenses)
    : null;

  const netWorthChange = parseFloat(currentMonth.netWorthChange);
  const netWorthChangePercent = previousMonth
    ? calculatePercentChange(currentMonth.netWorth, previousMonth.netWorth)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finančný Dashboard</h1>
        <p className="text-muted-foreground">
          Komplexný prehľad vašich financií za {currentMonth.month}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="💰 Príjmy"
          value={formatCurrency(currentMonth.totalIncome)}
          change={incomeChange ? `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(1)}%` : undefined}
          trend={incomeChange ? (incomeChange > 0 ? 'up' : 'down') : 'neutral'}
          icon={<DollarSignIcon />}
          subtitle="tento mesiac"
        />
        <KPICard
          title="💸 Výdaje"
          value={formatCurrency(currentMonth.totalExpenses)}
          change={expensesChange ? `${expensesChange > 0 ? '+' : ''}${expensesChange.toFixed(1)}%` : undefined}
          trend={expensesChange ? (expensesChange < 0 ? 'up' : 'down') : 'neutral'}
          icon={<WalletIcon />}
          subtitle="tento mesiac"
        />
        <KPICard
          title="📊 Bilancia"
          value={formatCurrency(currentMonth.netCashFlow)}
          subtitle="príjmy - výdaje"
          trend={parseFloat(currentMonth.netCashFlow) > 0 ? 'up' : parseFloat(currentMonth.netCashFlow) < 0 ? 'down' : 'neutral'}
        />
        <KPICard
          title="📈 Čistá hodnota"
          value={formatCurrency(currentMonth.netWorth)}
          change={netWorthChange !== 0 ? formatCurrency(Math.abs(netWorthChange).toString()) : undefined}
          changePercent={netWorthChangePercent ? `${netWorthChangePercent > 0 ? '+' : ''}${netWorthChangePercent.toFixed(1)}%` : undefined}
          trend={netWorthChange > 0 ? 'up' : netWorthChange < 0 ? 'down' : 'neutral'}
          icon={netWorthChange > 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
        />
      </div>

      {/* Loans & Assets Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <LoansSummary data={currentMonth} />
        <AssetsSummary data={currentMonth} />
      </div>

      {/* Charts */}
      {data.history.length > 1 && <FinancialCharts data={data.history} />}

      {/* Monthly Table */}
      {data.history.length > 0 && <MonthlyTable data={data.history} />}
    </div>
  );
}
