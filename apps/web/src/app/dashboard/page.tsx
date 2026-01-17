'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { useDashboard } from '@/hooks/useDashboard';
import {
  AlertsBanner,
  LoansQuickStatus,
  DocumentsQuickStatus,
  VehiclesQuickStatus,
  FinanceSummaryCollapsible,
  FinancialCharts,
  MonthlyTable,
  type AlertItem,
} from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, ChevronRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

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

  // Fetch dashboard alerts data
  const { data: alertsData, isLoading: alertsLoading, error: alertsError } = useDashboardAlerts({
    householdId: householdId || '',
    enabled: !!householdId,
  });

  // Fetch historical data for charts
  const { data: historyData } = useDashboard({
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

  if (alertsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        {/* Alert skeleton */}
        <Skeleton className="h-14 rounded-xl" />
        {/* Quick status cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
        {/* Finance summary skeleton */}
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  if (alertsError) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Chyba pri načítaní dát</CardTitle>
            <CardDescription>{alertsError.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!alertsData) {
    return null;
  }

  const { loans, documents, vehicles, finance } = alertsData;

  // Build alerts array
  const alerts: AlertItem[] = [
    {
      type: 'overdue_loans',
      count: loans.overdueCount,
      message: loans.overdueCount === 1 ? 'omeškaná splátka' : 'omeškaných splátok',
      href: '/dashboard/loans',
    },
    {
      type: 'expired_docs',
      count: documents.expiredCount,
      message: documents.expiredCount === 1 ? 'expirovaný dokument!' : 'expirovaných dokumentov!',
      href: '/dashboard/documents',
    },
    {
      type: 'expiring_docs',
      count: documents.expiringSoonCount,
      message: documents.expiringSoonCount === 1 ? 'končiaci dokument' : 'končiacich dokumentov',
      href: '/dashboard/documents',
    },
    {
      type: 'unpaid_fines',
      count: documents.unpaidFinesCount,
      message: documents.unpaidFinesCount === 1 ? 'nezaplatená pokuta' : 'nezaplatených pokút',
      href: '/dashboard/documents',
    },
  ];

  const hasAnyAlerts = alerts.some((a) => a.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Prehľad</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {finance.month}
          </p>
        </div>
        {!hasAnyAlerts && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-950/30">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Všetko OK
            </span>
          </div>
        )}
      </div>

      {/* Priority Alerts */}
      <AlertsBanner alerts={alerts} />

      {/* Quick Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <LoansQuickStatus
          totalDebt={loans.totalDebt}
          activeCount={loans.activeCount}
          overdueCount={loans.overdueCount}
          nextPayment={loans.nextPayment}
          totalProgress={loans.totalProgress}
        />
        <DocumentsQuickStatus
          totalCount={documents.totalCount}
          expiringCount={documents.expiringCount}
          expiredCount={documents.expiredCount}
          expiringSoonCount={documents.expiringSoonCount}
          unpaidFinesCount={documents.unpaidFinesCount}
          unpaidFinesTotal={documents.unpaidFinesTotal}
          nearestExpiring={documents.nearestExpiring}
        />
        <VehiclesQuickStatus
          totalCount={vehicles.totalCount}
          totalValue={vehicles.totalValue}
          loanBalance={vehicles.loanBalance}
          expiringDocsCount={vehicles.expiringDocsCount}
        />
      </div>

      {/* Finance Summary */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
          Finančný prehľad
        </h2>
        <FinanceSummaryCollapsible
          netWorth={finance.netWorth}
          netWorthChange={finance.netWorthChange}
          totalIncome={finance.totalIncome}
          totalExpenses={finance.totalExpenses}
          netCashFlow={finance.netCashFlow}
          month={finance.month}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
          Rýchle akcie
        </h2>
        <Link
          href="/dashboard/documents"
          className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/30">
              <FileWarning className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="font-medium">Zobraziť končiace dokumenty</span>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Historical Charts (if data available) */}
      {historyData && historyData.history.length > 1 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Historický vývoj
          </h2>
          <FinancialCharts data={historyData.history} />
        </div>
      )}

      {/* Monthly Table (collapsible on mobile) */}
      {historyData && historyData.history.length > 0 && (
        <div className="hidden md:block">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Mesačné prehľady
          </h2>
          <MonthlyTable data={historyData.history} />
        </div>
      )}
    </div>
  );
}
