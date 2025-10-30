import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { getIncomes, getCurrentHousehold, type Income } from '../../src/lib/api';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorMessage } from '../../src/components/ErrorMessage';

export default function IncomesScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);

  useEffect(() => {
    loadIncomes();
  }, []);

  const loadIncomes = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const incomesData = await getIncomes(household.id);
      setIncomes(incomesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať príjmy');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner message="Načítavam príjmy..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadIncomes} />;
  }

  return (
    <View style={styles.container}>
      {incomes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💵</Text>
          <Text style={styles.emptyText}>Zatiaľ nemáte žiadne príjmy</Text>
        </View>
      ) : (
        <FlatList
          data={incomes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.source}>{item.source || 'Príjem'}</Text>
                <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
              </View>
              <Text style={styles.date}>
                {new Date(item.date).toLocaleDateString('sk-SK')}
              </Text>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  source: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
});

