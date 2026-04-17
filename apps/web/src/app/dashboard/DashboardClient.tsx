'use client';

import dynamic from 'next/dynamic';
import { useDashboardAlerts } from '@/hooks/useDashboardAlerts';
import { useDashboard } from '@/hooks/useDashboard';
import {
  AlertsBanner,
  LoansQuickStatus,
  DocumentsQuickStatus,
  VehiclesQuickStatus,
  FinanceSummaryCollapsible,
  type AlertItem,
} from '@/components/dashboard';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, ChevronRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

// Lazy-load Recharts heavy chunks (only on demand pre prvy render).
// Fallback skeleton zachova layout, ssr:false zabrani SSR cost & hydration mismatch.
const FinancialCharts = dynamic(
  () => import('@/components/dashboard/FinancialCharts').then((m) => m.FinancialCharts),
  {
    ssr: false,
    loading: () => <Skeleton className="h-80 rounded-2xl" />,
  }
);
const MonthlyTable = dynamic(
  () => import('@/components/dashboard/MonthlyTable').then((m) => m.MonthlyTable),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 rounded-2xl" />,
  }
);

interface DashboardClientProps {
  householdId: string;
}

export function DashboardClient({ householdId }: DashboardClientProps): React.JSX.Element | null {
  // alerts data – cached + zdielany s BottomNav (rovnaký queryKey)
  const {
    data: alertsData,
    isLoading: alertsLoading,
    error: alertsError,
  } = useDashboardAlerts({ householdId });

  // historical chart data
  const { data: historyData } = useDashboard({ householdId, monthsCount: 12 });

  if (alertsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96 mt-2" />
        </div>
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Prehľad</h1>
          <p className="text-muted-foreground text-sm md:text-base">{finance.month}</p>
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

      <AlertsBanner alerts={alerts} />

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

      {historyData && historyData.history.length > 1 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
            Historický vývoj
          </h2>
          <FinancialCharts data={historyData.history} />
        </div>
      )}

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
