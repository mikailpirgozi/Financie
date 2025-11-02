import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { getCurrentHousehold, getDashboardData, type DashboardData } from '../../src/lib/api';
import { setupDashboardRealtimeSubscriptions, cleanupRealtimeSubscriptions } from '../../src/lib/realtime';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { DashboardKPICard } from '../../src/components/DashboardKPICard';
import { LoansSummaryCard } from '../../src/components/LoansSummaryCard';
import { AssetsSummaryCard } from '../../src/components/AssetsSummaryCard';
import { MonthlyHistoryCard } from '../../src/components/MonthlyHistoryCard';
import { SimpleLineChart, SimplePieChart } from '../../src/components/charts';
import { Toast } from '@/components/ui/Toast';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [channel, setChannel] = useState<ReturnType<typeof setupDashboardRealtimeSubscriptions> | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const router = useRouter();

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const setupRealtime = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // User not authenticated yet, skip realtime setup
          return;
        }

        const household = await getCurrentHousehold();
        const realtimeChannel = setupDashboardRealtimeSubscriptions(household.id, (type) => {
          // Auto-refresh dashboard when data changes
          console.log(`Data changed: ${type}`);
          loadDashboard();
        });
        setChannel(realtimeChannel);
      } catch (err) {
        // Log but don't fail - realtime is nice-to-have, not critical
        console.warn('Failed to setup realtime:', err instanceof Error ? err.message : String(err));
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        cleanupRealtimeSubscriptions(channel);
      }
    };
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading dashboard...');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('❌ No session found, redirecting to login');
        router.replace('/(auth)/login');
        return;
      }

      console.log('✅ Session found, user:', session.user.email);

      console.log('🏠 Fetching current household...');
      const household = await getCurrentHousehold();
      console.log('✅ Household loaded:', household.id, household.name);

      console.log('📊 Fetching dashboard data...');
      const data = await getDashboardData(household.id, 6);
      console.log('✅ Dashboard data loaded:', {
        currentMonth: data.currentMonth.month,
        historyLength: data.history.length,
      });
      
      setDashboardData(data);
    } catch (err) {
      console.error('❌ Dashboard load error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Nepodarilo sa načítať dáta';
      console.error('Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

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

  if (loading) {
    return <LoadingSpinner message="Načítavam dashboard..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadDashboard} />;
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
        <View>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>{currentMonth.month}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

      {/* KPI Cards */}
      <View style={styles.kpiSection}>
        <DashboardKPICard
          title="💰 Príjmy"
          value={formatCurrency(currentMonth.totalIncome)}
          change={incomeChange ? `${incomeChange > 0 ? '+' : ''}${incomeChange.toFixed(1)}%` : undefined}
          trend={incomeChange ? (incomeChange > 0 ? 'up' : 'down') : 'neutral'}
          color="#10b981"
        />
        <DashboardKPICard
          title="💸 Výdaje"
          value={formatCurrency(currentMonth.totalExpenses)}
          change={expensesChange ? `${expensesChange > 0 ? '+' : ''}${expensesChange.toFixed(1)}%` : undefined}
          trend={expensesChange ? (expensesChange < 0 ? 'up' : 'down') : 'neutral'}
          color="#ef4444"
        />
        <DashboardKPICard
          title="📊 Bilancia"
          value={formatCurrency(currentMonth.netCashFlow)}
          subtitle="príjmy - výdaje"
          trend={safeParseFloat(currentMonth.netCashFlow) > 0 ? 'up' : safeParseFloat(currentMonth.netCashFlow) < 0 ? 'down' : 'neutral'}
          color="#0070f3"
        />
        <DashboardKPICard
          title="📈 Čistá hodnota"
          value={formatCurrency(currentMonth.netWorth)}
          change={
            netWorthChange !== 0
              ? `${netWorthChange > 0 ? '+' : ''}${formatCurrency(Math.abs(netWorthChange).toString())} (${netWorthChangePercent ? netWorthChangePercent.toFixed(1) : '0'}%)`
              : undefined
          }
          trend={netWorthChange > 0 ? 'up' : netWorthChange < 0 ? 'down' : 'neutral'}
          color="#8b5cf6"
        />
      </View>

      {/* Charts Section */}
      {history.length > 0 && (
        <View style={styles.chartsSection}>
          <SimpleLineChart
            title="📈 Príjmy a Výdaje (trendy)"
            data={history.slice(0, 6).map((month) => ({
              label: month.month.split(' ')[0],
              value: safeParseFloat(month.totalIncome),
            }))}
            color="#10b981"
            formatter={(v) => `€${Math.round(v)}`}
          />
          
          <SimpleLineChart
            title="📊 Čistá hodnota (trend)"
            data={history.slice(0, 6).map((month) => ({
              label: month.month.split(' ')[0],
              value: safeParseFloat(month.netWorth),
            }))}
            color="#8b5cf6"
            formatter={(v) => `€${Math.round(v)}`}
          />

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
        </View>
      )}

      {/* Monthly History */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>📊 História (posledných 6 mesiacov)</Text>
          {history.map((monthData) => (
            <MonthlyHistoryCard key={monthData.month} data={monthData} />
          ))}
        </View>
      )}

      {/* Loans & Assets Summary */}
      <View style={styles.summarySection}>
        <LoansSummaryCard data={currentMonth} />
        <AssetsSummaryCard data={currentMonth} />
      </View>

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
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
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
