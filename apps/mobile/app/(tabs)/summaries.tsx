import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { getCurrentHousehold } from '../../src/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';

interface MonthlySummary {
  month: string;
  year: number;
  total_income: number;
  total_expenses: number;
  net_cash_flow: number;
  loan_payments: number;
  net_worth: number;
}

export default function SummariesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    loadSummaries();
  }, []);

  const loadSummaries = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/summaries?householdId=${household.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Nepodarilo sa načítať súhrny');
      }

      const data = await response.json();
      setSummaries(data.summaries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať súhrny');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSummaries();
    setRefreshing(false);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (month: string, year: number): string => {
    const monthNames = [
      'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
      'Júl', 'August', 'September', 'Október', 'November', 'December'
    ];
    const monthIndex = parseInt(month, 10) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  };

  const renderSummaryCard = ({ item }: { item: MonthlySummary }) => {
    const isPositive = item.net_cash_flow >= 0;

    return (
      <Card style={styles.summaryCard}>
        <Text style={styles.monthTitle}>
          {getMonthName(item.month, item.year)}
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Príjmy</Text>
          <Text style={[styles.value, styles.income]}>
            {formatCurrency(item.total_income)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Výdavky</Text>
          <Text style={[styles.value, styles.expense]}>
            {formatCurrency(item.total_expenses)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Platby úverov</Text>
          <Text style={[styles.value, styles.expense]}>
            {formatCurrency(item.loan_payments)}
          </Text>
        </View>

        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>Cash flow</Text>
          <Text style={[styles.totalValue, isPositive ? styles.positive : styles.negative]}>
            {isPositive ? '+' : ''}{formatCurrency(item.net_cash_flow)}
          </Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Čisté imanie</Text>
          <Text style={[styles.value, styles.netWorth]}>
            {formatCurrency(item.net_worth)}
          </Text>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Načítavam súhrny..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error} onRetry={loadSummaries} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesačné súhrny</Text>
      </View>

      <View style={styles.content}>
        {summaries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>Zatiaľ nemáte žiadne súhrny</Text>
          </View>
        ) : (
          <FlatList
            data={summaries}
            keyExtractor={(item) => `${item.year}-${item.month}`}
            renderItem={renderSummaryCard}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </View>

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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  income: {
    color: '#10b981',
  },
  expense: {
    color: '#ef4444',
  },
  netWorth: {
    color: '#8b5cf6',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  positive: {
    color: '#10b981',
  },
  negative: {
    color: '#ef4444',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

