import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { getExpenses, getCurrentHousehold, type Expense } from '../../src/lib/api';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { ExpenseCard } from '../../src/components/ExpenseCard';

export default function ExpensesScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const expensesData = await getExpenses(household.id);
      setExpenses(expensesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať výdavky');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Načítavam výdavky..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadExpenses} />;
  }

  return (
    <View style={styles.container}>
      {expenses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💸</Text>
          <Text style={styles.emptyText}>Zatiaľ nemáte žiadne výdavky</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpenseCard expense={item} />}
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
});

