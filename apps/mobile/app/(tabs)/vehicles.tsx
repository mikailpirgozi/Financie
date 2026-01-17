import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { useVehicles } from '@/hooks';
import { getCurrentHousehold, deleteVehicle, type Vehicle } from '@/lib/api';
import { VehicleCard } from '@/components/vehicles';
import { FloatingActionButton } from '@/components/ui';
import { ErrorMessage } from '@/components/ErrorMessage';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function VehiclesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load household on mount
  React.useEffect(() => {
    getCurrentHousehold().then(h => setHouseholdId(h.id)).catch(console.error);
  }, []);

  const { vehicles, stats, isLoading, error, refetch } = useVehicles(householdId);

  useFocusEffect(
    useCallback(() => {
      if (householdId) {
        refetch();
      }
    }, [householdId, refetch])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleVehiclePress = (vehicle: Vehicle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(tabs)/vehicles/${vehicle.id}`);
  };

  const handleVehicleLongPress = (vehicle: Vehicle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      vehicle.name,
      'Čo chcete urobiť?',
      [
        { text: 'Detail', onPress: () => router.push(`/(tabs)/vehicles/${vehicle.id}`) },
        { text: 'Upraviť', onPress: () => router.push(`/(tabs)/vehicles/${vehicle.id}/edit`) },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Zmazať vozidlo',
              `Naozaj chcete zmazať "${vehicle.name}"?`,
              [
                { text: 'Zrušiť', style: 'cancel' },
                {
                  text: 'Zmazať',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteVehicle(vehicle.id);
                      refetch();
                    } catch (err) {
                      Alert.alert('Chyba', 'Nepodarilo sa zmazať vozidlo');
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Zrušiť', style: 'cancel' },
      ]
    );
  };

  const handleAddVehicle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/vehicles/new');
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <VehicleCard
      vehicle={item}
      onPress={() => handleVehiclePress(item)}
      onLongPress={() => handleVehicleLongPress(item)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        Žiadne vozidlá
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Pridajte prvé vozidlo klepnutím na tlačidlo +
      </Text>
    </View>
  );

  const renderHeader = () => {
    if (!stats || vehicles.length === 0) return null;

    return (
      <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stats.totalCount}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Vozidiel
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(stats.totalValue)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Hodnota
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {formatCurrency(stats.totalLoanBalance)}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Úvery
            </Text>
          </View>
        </View>
        {stats.expiringSoonCount > 0 && (
          <View style={[styles.alertBanner, { backgroundColor: theme.colors.warning + '20' }]}>
            <Ionicons name="warning" size={16} color={theme.colors.warning} />
            <Text style={[styles.alertText, { color: theme.colors.warning }]}>
              {stats.expiringSoonCount} vozidiel s končiacou platnosťou dokumentov
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Vozidlá</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Vozidlá</Text>
        </View>
        <ErrorMessage message={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Vozidlá</Text>
      </View>

      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />

      <FloatingActionButton
        icon={<Plus color="#fff" size={24} />}
        onPress={handleAddVehicle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  statsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
