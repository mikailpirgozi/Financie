import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { setupDashboardRealtimeSubscriptions, cleanupRealtimeSubscriptions } from '../../src/lib/realtime';
import { DashboardSkeleton } from '../../src/components/DashboardSkeleton';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { DashboardKPICard } from '../../src/components/DashboardKPICard';
import { LoansSummaryCard } from '../../src/components/LoansSummaryCard';
import { AssetsSummaryCard } from '../../src/components/AssetsSummaryCard';
import { MonthlyHistoryCard } from '../../src/components/MonthlyHistoryCard';
import { SimplePieChart } from '../../src/components/charts';
import { InteractiveCharts } from '../../src/components/charts/InteractiveCharts';
import { Toast } from '@/components/ui/Toast';
import { useCriticalDashboard, useSmartRefreshIndicator } from '../../src/hooks/useProgressiveDashboard';
import { LazyChartSection, LazyHistorySection, useProgressiveRender } from '../../src/components/LazySection';

export default function DashboardScreen() {
  const [, setChannel] = useState<ReturnType<typeof setupDashboardRealtimeSubscriptions> | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const router = useRouter();
  
  // 🔄 DOČASNE: Používame legacy verziu kým nie je Vercel deployment hotový
  // Po deployi sa automaticky prepne na optimalizovanú verziu
  const { 
    household, 
    dashboard: dashboardData, 
    overdueCount, 
    upcomingCount, 
    isLoading, 
    error,
    refetch,
  } = useCriticalDashboard(6); // Ak 404, automatický fallback na legacy
  
  // Smart refresh indikátor (len pri background refetch)
  const { showIndicator } = useSmartRefreshIndicator();
  
  // Progressive rendering sekcií
  const { shouldRender } = useProgressiveRender(['kpi', 'summary', 'charts', 'history'], 150);

  // Setup realtime subscriptions with throttling
  useEffect(() => {
    if (!household?.id) return;

    let lastRefetch = Date.now();
    const realtimeChannel = setupDashboardRealtimeSubscriptions(household.id, () => {
      const now = Date.now();
      // Throttle refetch to max 1 per 5 seconds to prevent UI blocking
      if (now - lastRefetch > 5000) {
        lastRefetch = now;
        refetch();
      }
    });
    
    setChannel(realtimeChannel);

    return () => {
      if (realtimeChannel) {
        cleanupRealtimeSubscriptions(realtimeChannel);
      }
    };
  }, [household?.id, refetch]);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0 €';
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const calculatePercentChange = (current: string | number, previous: string | number) => {
    const curr = typeof current === 'string' ? parseFloat(current) : current;
    const prev = typeof previous === 'string' ? parseFloat(previous) : previous;
    if (isNaN(curr) || isNaN(prev) || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const safeParseFloat = (value: string | number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? 0 : num;
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorMessage message={error instanceof Error ? error.message : 'Nepodarilo sa načítať dáta'} onRetry={() => refetch()} />;
  }

  if (!dashboardData) {
    return null;
  }

  const { currentMonth, history } = dashboardData;
  const previousMonth = history.length > 1 ? history[1] : null;

  const incomeChange = previousMonth
    ? calculatePercentChange(currentMonth.totalIncome, previousMonth.totalIncome)
    : null;

  const expensesChange = previousMonth
    ? calculatePercentChange(currentMonth.totalExpenses, previousMonth.totalExpenses)
    : null;

  const netWorthChange = safeParseFloat(currentMonth.netWorthChange);
  const netWorthChangePercent = previousMonth
    ? calculatePercentChange(currentMonth.netWorth, previousMonth.netWorth)
    : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>{currentMonth.month}</Text>
        </View>
        {/* Mini refresh indikátor pri background refetch */}
        {showIndicator && (
          <View style={styles.refreshIndicator}>
            <Text style={styles.refreshText}>●</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
        }
      >
        {/* Overdue Alert Banner */}
        {/* Alert banner - vždy hneď viditeľné */}
        {overdueCount > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/(tabs)/loans')}
            activeOpacity={0.7}
          >
            <View style={styles.alertContent}>
              <AlertTriangle size={32} color="#92400e" style={styles.alertIconSpace} />
              <View style={styles.alertTextContainer}>
                <Text style={styles.alertTitle}>
                  {overdueCount === 1
                    ? 'Máte 1 omeškanú splátku'
                    : `Máte ${overdueCount} omeškané splátky`}
                </Text>
                <Text style={styles.alertSubtitle}>
                  Kliknite pre zobrazenie
                </Text>
              </View>
            </View>
            <ChevronRight size={24} color="#92400e" />
          </TouchableOpacity>
        )}

      {/* 🔥 PRIORITY 1: KPI Cards - render okamžite */}
      {shouldRender('kpi') && (
      <View style={styles.kpiSection}>
        <DashboardKPICard
          title="Príjmy"
          value={formatCurrency(currentMonth.totalIncome)}
          change={incomeChange ? `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(1)}%` : undefined}
          trend={incomeChange ? (incomeChange > 0 ? 'up' : 'down') : 'neutral'}
          color="#10b981"
          icon={<DollarSign size={20} color="#10b981" />}
        />
        <DashboardKPICard
          title="Výdaje"
          value={formatCurrency(currentMonth.totalExpenses)}
          change={expensesChange ? `${expensesChange > 0 ? '+' : ''}${expensesChange.toFixed(1)}%` : undefined}
          trend={expensesChange ? (expensesChange < 0 ? 'up' : 'down') : 'neutral'}
          color="#ef4444"
          icon={<TrendingDown size={20} color="#ef4444" />}
        />
        <DashboardKPICard
          title="Bilancia"
          value={formatCurrency(currentMonth.netCashFlow)}
          subtitle="príjmy - výdaje"
          trend={safeParseFloat(currentMonth.netCashFlow) > 0 ? 'up' : safeParseFloat(currentMonth.netCashFlow) < 0 ? 'down' : 'neutral'}
          color="#0070f3"
          icon={<TrendingUp size={20} color="#0070f3" />}
        />
        <DashboardKPICard
          title="Čistá hodnota"
          value={formatCurrency(currentMonth.netWorth)}
          change={
            netWorthChange !== 0
              ? `${netWorthChange > 0 ? '+' : ''}${formatCurrency(Math.abs(netWorthChange).toString())} (${netWorthChangePercent ? netWorthChangePercent.toFixed(1) : '0'}%)`
              : undefined
          }
          trend={netWorthChange > 0 ? 'up' : netWorthChange < 0 ? 'down' : 'neutral'}
          color="#8b5cf6"
          icon={<TrendingUp size={20} color="#8b5cf6" />}
        />
      </View>
      )}

      {/* 🔥 PRIORITY 2: Summary Cards - render po KPI */}
      {shouldRender('summary') && (
      <View style={styles.summarySection}>
        <LoansSummaryCard data={currentMonth} overdueCount={overdueCount} upcomingCount={upcomingCount} />
        <AssetsSummaryCard data={currentMonth} />
      </View>
      )}

      {/* 🔥 PRIORITY 3: Charts - lazy load */}
      {shouldRender('charts') && history.length > 0 && (
        <LazyChartSection style={styles.chartsSection}>
          <InteractiveCharts data={history.slice(0, 6)} />
          
          <SimplePieChart
            title="💸 Rozdelenie výdavkov (posledný mesiac)"
            data={[
              {
                label: 'Výdavky',
                value: safeParseFloat(currentMonth.totalExpenses),
                color: '#ef4444',
              },
              {
                label: 'Príjmy',
                value: safeParseFloat(currentMonth.totalIncome),
                color: '#10b981',
              },
              {
                label: 'Zvyšok',
                value: Math.max(0, safeParseFloat(currentMonth.netCashFlow)),
                color: '#0070f3',
              },
            ]}
          />
        </LazyChartSection>
      )}

      {/* 🔥 PRIORITY 4: History - lazy load, najnižšia priorita */}
      {shouldRender('history') && history.length > 0 && (
        <LazyHistorySection style={styles.historySection}>
          <Text style={styles.sectionTitle}>📊 História (posledných 6 mesiacov)</Text>
          {history.map((monthData) => (
            <MonthlyHistoryCard key={monthData.month} data={monthData} />
          ))}
        </LazyHistorySection>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Rýchle akcie</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/loans')}
        >
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionText}>Zobraziť úvery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/expenses')}
        >
          <Text style={styles.actionIcon}>💸</Text>
          <Text style={styles.actionText}>Pridať výdavok</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/incomes')}
        >
          <Text style={styles.actionIcon}>💵</Text>
          <Text style={styles.actionText}>Pridať príjem</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },
  refreshIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  alertCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIconSpace: {
    marginRight: 12,
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 2,
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#92400e',
    opacity: 0.8,
  },
  kpiSection: {
    padding: 16,
  },
  summarySection: {
    paddingHorizontal: 16,
  },
  historySection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  quickActions: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  chartsSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
