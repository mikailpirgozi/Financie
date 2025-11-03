import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LoanCalendar } from '@/components/portfolio';
import { useLoanCalendar } from '@/hooks/usePortfolio';
import { getCurrentHousehold } from '@/lib/api';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function LoanCalendarScreen() {
  const [householdId, setHouseholdId] = React.useState<string>('');

  React.useEffect(() => {
    loadHousehold();
  }, []);

  const loadHousehold = async () => {
    try {
      const household = await getCurrentHousehold();
      setHouseholdId(household.id);
    } catch (error) {
      console.error('Failed to load household:', error);
    }
  };

  const { data, isLoading, error, refetch } = useLoanCalendar(householdId, {
    monthsCount: 6,
  });

  if (!householdId) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>Žiadna domácnosť</Text>
          <Text style={styles.emptyText}>
            Zatiaľ nemáte vytvorenú domácnosť.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Splátkový kalendár</Text>
        </View>
        <ScrollView style={styles.content}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Splátkový kalendár</Text>
        </View>
        <ErrorMessage
          message={error instanceof Error ? error.message : 'Nepodarilo sa načítať kalendár'}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  if (!data?.calendar || data.calendar.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Splátkový kalendár</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>Žiadne splátky</Text>
          <Text style={styles.emptyText}>
            Nemáte žiadne aktívne úvery so splátkami.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Splátkový kalendár</Text>
        <Text style={styles.subtitle}>
          {data.summary.totalMonths} {data.summary.totalMonths === 1 ? 'mesiac' : 'mesiace'}
        </Text>
      </View>

      <LoanCalendar calendar={data.calendar} summary={data.summary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#0070f3',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

