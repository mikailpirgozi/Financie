import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { getLoans, getCurrentHousehold, type Loan } from '../../src/lib/api';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { LoanCard } from '../../src/components/LoanCard';

export default function LoansScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const loansData = await getLoans(household.id);
      setLoans(loansData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať úvery');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Načítavam úvery..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadLoans} />;
  }

  return (
    <View style={styles.container}>
      {loans.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={styles.emptyText}>Zatiaľ nemáte žiadne úvery</Text>
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>Pridať úver</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LoanCard
              loan={item}
              onPress={() => {
                // Navigate to loan detail
                console.log('Navigate to loan', item.id);
              }}
            />
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
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#0070f3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

