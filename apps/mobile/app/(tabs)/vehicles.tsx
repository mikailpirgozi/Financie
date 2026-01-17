import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Plus, Filter, X, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { useVehicles } from '@/hooks';
import { getCurrentHousehold, deleteVehicle, type Vehicle } from '@/lib/api';
import { VehicleCard } from '@/components/vehicles';
import { FloatingActionButton } from '@/components/ui';
import { ErrorMessage } from '@/components/ErrorMessage';
import { Modal } from '@/components/ui/Modal';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type GroupBy = 'none' | 'company' | 'make';

export default function VehiclesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

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

  // Extract unique companies and makes for filters
  const { companies, makes } = useMemo(() => {
    const companiesSet = new Set<string>();
    const makesSet = new Set<string>();
    
    vehicles.forEach(v => {
      if (v.registeredCompany) companiesSet.add(v.registeredCompany);
      if (v.make) makesSet.add(v.make);
    });

    return {
      companies: Array.from(companiesSet).sort((a, b) => a.localeCompare(b, 'sk')),
      makes: Array.from(makesSet).sort((a, b) => a.localeCompare(b, 'sk')),
    };
  }, [vehicles]);

  // Filter and group vehicles
  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.name.toLowerCase().includes(query) ||
        v.make?.toLowerCase().includes(query) ||
        v.model?.toLowerCase().includes(query) ||
        v.licensePlate?.toLowerCase().includes(query) ||
        v.registeredCompany?.toLowerCase().includes(query)
      );
    }

    // Apply company filter
    if (selectedCompany) {
      result = result.filter(v => v.registeredCompany === selectedCompany);
    }

    // Apply make filter
    if (selectedMake) {
      result = result.filter(v => v.make === selectedMake);
    }

    return result;
  }, [vehicles, searchQuery, selectedCompany, selectedMake]);

  // Group vehicles
  const groupedVehicles = useMemo(() => {
    if (groupBy === 'none') {
      return [{ title: null, data: filteredVehicles }];
    }

    const groups: Record<string, Vehicle[]> = {};
    const ungrouped: Vehicle[] = [];

    filteredVehicles.forEach(v => {
      const key = groupBy === 'company' ? v.registeredCompany : v.make;
      if (key) {
        if (!groups[key]) groups[key] = [];
        groups[key].push(v);
      } else {
        ungrouped.push(v);
      }
    });

    const result = Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b, 'sk'))
      .map(([title, data]) => ({ title, data }));

    if (ungrouped.length > 0) {
      result.push({ title: 'Ostatné', data: ungrouped });
    }

    return result;
  }, [filteredVehicles, groupBy]);

  const hasActiveFilters = selectedCompany || selectedMake || groupBy !== 'none';

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
    const title = vehicle.make && vehicle.model 
      ? `${vehicle.make} ${vehicle.model}` 
      : vehicle.name;
    
    Alert.alert(
      title,
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
              `Naozaj chcete zmazať "${title}"?`,
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

  const clearFilters = () => {
    setSelectedCompany(null);
    setSelectedMake(null);
    setGroupBy('none');
    setSearchQuery('');
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
        {hasActiveFilters || searchQuery ? 'Žiadne vozidlá' : 'Žiadne vozidlá'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        {hasActiveFilters || searchQuery 
          ? 'Skúste zmeniť filter alebo hľadaný výraz'
          : 'Pridajte prvé vozidlo klepnutím na tlačidlo +'
        }
      </Text>
      {(hasActiveFilters || searchQuery) && (
        <TouchableOpacity 
          style={[styles.clearButton, { backgroundColor: theme.colors.primary + '20' }]}
          onPress={clearFilters}
        >
          <Text style={[styles.clearButtonText, { color: theme.colors.primary }]}>
            Zrušiť filtre
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* Stats card */}
      {stats && vehicles.length > 0 && (
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
      )}

      {/* Active filters summary */}
      {(hasActiveFilters || searchQuery) && (
        <View style={[styles.activeFilters, { backgroundColor: theme.colors.card }]}>
          <View style={styles.activeFiltersContent}>
            {searchQuery && (
              <View style={[styles.filterChip, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.filterChipText, { color: theme.colors.primary }]}>
                  "{searchQuery}"
                </Text>
              </View>
            )}
            {selectedCompany && (
              <View style={[styles.filterChip, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="business-outline" size={12} color={theme.colors.primary} />
                <Text style={[styles.filterChipText, { color: theme.colors.primary }]}>
                  {selectedCompany}
                </Text>
              </View>
            )}
            {selectedMake && (
              <View style={[styles.filterChip, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="car-outline" size={12} color={theme.colors.primary} />
                <Text style={[styles.filterChipText, { color: theme.colors.primary }]}>
                  {selectedMake}
                </Text>
              </View>
            )}
            {groupBy !== 'none' && (
              <View style={[styles.filterChip, { backgroundColor: theme.colors.textSecondary + '20' }]}>
                <Ionicons name="layers-outline" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.filterChipText, { color: theme.colors.textSecondary }]}>
                  {groupBy === 'company' ? 'Podľa firmy' : 'Podľa značky'}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
            <X size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Results count */}
      {(hasActiveFilters || searchQuery) && filteredVehicles.length > 0 && (
        <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
          Nájdených {filteredVehicles.length} z {vehicles.length} vozidiel
        </Text>
      )}
    </View>
  );

  const renderSectionHeader = (title: string | null) => {
    if (!title) return null;
    return (
      <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
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
        {vehicles.length > 0 && (
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              hasActiveFilters && { backgroundColor: theme.colors.primary + '20' }
            ]}
            onPress={() => setShowFilters(true)}
          >
            <Filter size={20} color={hasActiveFilters ? theme.colors.primary : theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search bar */}
      {vehicles.length > 0 && (
        <View style={[styles.searchBar, { backgroundColor: theme.colors.card }]}>
          <Search size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Hľadať vozidlo..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={groupedVehicles.flatMap(group => [
          group.title ? { type: 'header' as const, title: group.title } : null,
          ...group.data.map(item => ({ type: 'vehicle' as const, vehicle: item })),
        ].filter(Boolean))}
        renderItem={({ item }) => {
          if (!item) return null;
          if (item.type === 'header') {
            return renderSectionHeader(item.title);
          }
          return renderVehicle({ item: item.vehicle });
        }}
        keyExtractor={(item, index) => {
          if (!item) return `null-${index}`;
          if (item.type === 'header') return `header-${item.title}`;
          return item.vehicle.id;
        }}
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

      {/* Filters Modal */}
      <Modal 
        visible={showFilters} 
        onClose={() => setShowFilters(false)} 
        title="Filtre a zoskupenie"
      >
        <View style={styles.filtersContent}>
          {/* Company filter */}
          {companies.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>
                Firma
              </Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor: theme.colors.border },
                    !selectedCompany && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setSelectedCompany(null)}
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: !selectedCompany ? theme.colors.primary : theme.colors.text }
                  ]}>
                    Všetky
                  </Text>
                </TouchableOpacity>
                {companies.map(company => (
                  <TouchableOpacity
                    key={company}
                    style={[
                      styles.filterOption,
                      { borderColor: theme.colors.border },
                      selectedCompany === company && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                    ]}
                    onPress={() => setSelectedCompany(selectedCompany === company ? null : company)}
                  >
                    <Text style={[
                      styles.filterOptionText, 
                      { color: selectedCompany === company ? theme.colors.primary : theme.colors.text }
                    ]}>
                      {company}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Make filter */}
          {makes.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>
                Značka
              </Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor: theme.colors.border },
                    !selectedMake && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setSelectedMake(null)}
                >
                  <Text style={[
                    styles.filterOptionText, 
                    { color: !selectedMake ? theme.colors.primary : theme.colors.text }
                  ]}>
                    Všetky
                  </Text>
                </TouchableOpacity>
                {makes.map(make => (
                  <TouchableOpacity
                    key={make}
                    style={[
                      styles.filterOption,
                      { borderColor: theme.colors.border },
                      selectedMake === make && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                    ]}
                    onPress={() => setSelectedMake(selectedMake === make ? null : make)}
                  >
                    <Text style={[
                      styles.filterOptionText, 
                      { color: selectedMake === make ? theme.colors.primary : theme.colors.text }
                    ]}>
                      {make}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Group by */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: theme.colors.text }]}>
              Zoskupiť
            </Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  { borderColor: theme.colors.border },
                  groupBy === 'none' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                ]}
                onPress={() => setGroupBy('none')}
              >
                <Text style={[
                  styles.filterOptionText, 
                  { color: groupBy === 'none' ? theme.colors.primary : theme.colors.text }
                ]}>
                  Bez zoskupenia
                </Text>
              </TouchableOpacity>
              {companies.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor: theme.colors.border },
                    groupBy === 'company' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setGroupBy('company')}
                >
                  <Ionicons 
                    name="business-outline" 
                    size={14} 
                    color={groupBy === 'company' ? theme.colors.primary : theme.colors.text} 
                  />
                  <Text style={[
                    styles.filterOptionText, 
                    { color: groupBy === 'company' ? theme.colors.primary : theme.colors.text, marginLeft: 4 }
                  ]}>
                    Podľa firmy
                  </Text>
                </TouchableOpacity>
              )}
              {makes.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    { borderColor: theme.colors.border },
                    groupBy === 'make' && { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary },
                  ]}
                  onPress={() => setGroupBy('make')}
                >
                  <Ionicons 
                    name="car-outline" 
                    size={14} 
                    color={groupBy === 'make' ? theme.colors.primary : theme.colors.text} 
                  />
                  <Text style={[
                    styles.filterOptionText, 
                    { color: groupBy === 'make' ? theme.colors.primary : theme.colors.text, marginLeft: 4 }
                  ]}>
                    Podľa značky
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Clear all */}
          {hasActiveFilters && (
            <TouchableOpacity 
              style={[styles.clearAllButton, { borderColor: theme.colors.border }]}
              onPress={() => {
                clearFilters();
                setShowFilters(false);
              }}
            >
              <Text style={[styles.clearAllButtonText, { color: theme.colors.error }]}>
                Zrušiť všetky filtre
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
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
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  activeFiltersContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clearFiltersButton: {
    padding: 4,
  },
  resultsCount: {
    fontSize: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  clearButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filtersContent: {
    paddingBottom: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterOptionText: {
    fontSize: 14,
  },
  clearAllButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
  },
  clearAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
