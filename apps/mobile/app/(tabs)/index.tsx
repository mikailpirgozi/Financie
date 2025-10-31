import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
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

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [channel, setChannel] = useState<any>(null);
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

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }

      const household = await getCurrentHousehold();

      const data = await getDashboardData(household.id, 6);
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať dáta');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Odhlásiť sa', 'Naozaj sa chcete odhlásiť?', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Odhlásiť',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const calculatePercentChange = (current: string, previous: string) => {
    const curr = parseFloat(current);
    const prev = parseFloat(previous);
    if (prev === 0) return null;
    return ((curr - prev) / prev) * 100;
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

  const netWorthChange = parseFloat(currentMonth.netWorthChange);
  const netWorthChangePercent = previousMonth
    ? calculatePercentChange(currentMonth.netWorth, previousMonth.netWorth)
    : null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Finančný Dashboard</Text>
          <Text style={styles.subtitle}>{currentMonth.month}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Odhlásiť</Text>
        </TouchableOpacity>
      </View>

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
          trend={parseFloat(currentMonth.netCashFlow) > 0 ? 'up' : parseFloat(currentMonth.netCashFlow) < 0 ? 'down' : 'neutral'}
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
              value: parseFloat(month.totalIncome),
            }))}
            color="#10b981"
            formatter={(v) => `€${Math.round(v)}`}
          />
          
          <SimpleLineChart
            title="📊 Čistá hodnota (trend)"
            data={history.slice(0, 6).map((month) => ({
              label: month.month.split(' ')[0],
              value: parseFloat(month.netWorth),
            }))}
            color="#8b5cf6"
            formatter={(v) => `€${Math.round(v)}`}
          />

          <SimplePieChart
            title="💸 Rozdelenie výdavkov (posledný mesiac)"
            data={[
              {
                label: 'Výdavky',
                value: parseFloat(currentMonth.totalExpenses),
                color: '#ef4444',
              },
              {
                label: 'Príjmy',
                value: parseFloat(currentMonth.totalIncome),
                color: '#10b981',
              },
              {
                label: 'Zvyšok',
                value: Math.max(0, parseFloat(currentMonth.netCashFlow)),
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
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
