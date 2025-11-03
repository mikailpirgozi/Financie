import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { PortfolioOverviewCard } from '@/components/portfolio';
import { usePortfolioOverview } from '@/hooks/usePortfolio';
import { getCurrentHousehold } from '@/lib/api';
import { ErrorMessage } from '@/components/ErrorMessage';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ChevronRight } from 'lucide-react-native';

export default function PortfolioScreen() {
  const router = useRouter();
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

  const { data, isLoading, error, refetch } = usePortfolioOverview(householdId);

  if (!householdId) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏠</Text>
          <Text style={styles.emptyTitle}>Žiadna domácnosť</Text>
          <Text style={styles.emptyText}>
            Zatiaľ nemáte vytvorenú domácnosť. Kontaktujte administrátora.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio</Text>
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
          <Text style={styles.title}>Portfolio</Text>
        </View>
        <ErrorMessage
          message={error instanceof Error ? error.message : 'Nepodarilo sa načítať portfólio'}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  if (!data?.portfolio) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Portfolio</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>Žiadne dáta</Text>
          <Text style={styles.emptyText}>
            Pridajte majetky a úvery pre zobrazenie portfólia.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Portfolio Management</Text>
        <Text style={styles.subtitle}>Prehľad majetkov a úverov</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => refetch()} />
        }
      >
        <PortfolioOverviewCard data={data.portfolio} />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Akcie</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(screens)/assets')}
          >
            <View style={styles.actionLeft}>
              <Text style={styles.actionIcon}>🏠</Text>
              <View>
                <Text style={styles.actionTitle}>Zobraziť majetky</Text>
                <Text style={styles.actionSubtitle}>
                  {data.portfolio.totalAssetsCount} majetkov
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/loans')}
          >
            <View style={styles.actionLeft}>
              <Text style={styles.actionIcon}>💳</Text>
              <View>
                <Text style={styles.actionTitle}>Zobraziť úvery</Text>
                <Text style={styles.actionSubtitle}>
                  {data.portfolio.totalLoansCount} úverov
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(screens)/portfolio/calendar')}
          >
            <View style={styles.actionLeft}>
              <Text style={styles.actionIcon}>📅</Text>
              <View>
                <Text style={styles.actionTitle}>Splátkový kalendár</Text>
                <Text style={styles.actionSubtitle}>Najbližšie splátky</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  quickActions: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
});

