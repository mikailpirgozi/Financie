import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { getIncomes, getCurrentHousehold, deleteIncome, type Income } from '../../src/lib/api';
import { useTheme } from '../../src/contexts';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Toast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { SegmentControl, SegmentOption } from '@/components/ui/SegmentControl';
import { IncomeHeroCard } from '../../src/components/incomes/IncomeHeroCard';
import { IncomeListItem } from '../../src/components/incomes/IncomeListItem';
import { IncomeActionSheet } from '../../src/components/incomes/IncomeActionSheet';

type FilterPeriod = 'all' | 'this_month' | 'last_month';
type SortBy = 'date' | 'amount' | 'source';

export default function IncomesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('this_month');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Action sheet state
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadIncomes();
    }, [])
  );

  const loadIncomes = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const incomesData = await getIncomes(household.id);
      setIncomes(incomesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa nacitat prijmy');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncomes();
    setRefreshing(false);
  };

  // Filter incomes by period
  const getFilteredIncomes = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return incomes.filter((income) => {
      if (filterPeriod === 'all') return true;

      const incomeDate = new Date(income.date);
      const incomeMonth = incomeDate.getMonth();
      const incomeYear = incomeDate.getFullYear();

      if (filterPeriod === 'this_month') {
        return incomeMonth === currentMonth && incomeYear === currentYear;
      }

      if (filterPeriod === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return incomeMonth === lastMonth && incomeYear === lastMonthYear;
      }

      return true;
    });
  };

  // Sort incomes
  const getSortedIncomes = (filtered: Income[]) => {
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'source':
          const srcA = a.source || '';
          const srcB = b.source || '';
          return srcA.localeCompare(srcB);
        case 'date':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  };

  const filteredIncomes = getFilteredIncomes();
  const sortedIncomes = getSortedIncomes(filteredIncomes);

  // Calculate stats
  const totalIncome = filteredIncomes.reduce((sum, i) => sum + i.amount, 0);
  const incomeCount = filteredIncomes.length;
  const recurringCount = filteredIncomes.filter((i) => i.is_recurring).length;

  // Calculate percent change (this month vs last month)
  const calculatePercentChange = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const thisMonthTotal = incomes
      .filter((i) => {
        const d = new Date(i.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, i) => sum + i.amount, 0);

    const lastMonthTotal = incomes
      .filter((i) => {
        const d = new Date(i.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((sum, i) => sum + i.amount, 0);

    if (lastMonthTotal === 0) return null;
    return ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  };

  const percentChange = filterPeriod === 'this_month' ? calculatePercentChange() : null;

  // Filter options
  const filterOptions: SegmentOption<FilterPeriod>[] = [
    { value: 'this_month', label: 'Tento mesiac' },
    { value: 'last_month', label: 'Minuly mesiac' },
    { value: 'all', label: 'Vsetky' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Action handlers
  const handleIncomePress = (incomeId: string) => {
    router.push(`/(tabs)/incomes/${incomeId}`);
  };

  const handleIncomeLongPress = (income: Income) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIncome(income);
    setActionSheetVisible(true);
  };

  const handleCloseActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedIncome(null);
  };

  const handleView = () => {
    if (!selectedIncome) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/incomes/${selectedIncome.id}`);
  };

  const handleEdit = () => {
    if (!selectedIncome) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/incomes/${selectedIncome.id}/edit`);
  };

  const handleDuplicate = () => {
    if (!selectedIncome) return;
    handleCloseActionSheet();
    router.push({
      pathname: '/(tabs)/incomes/new',
      params: {
        duplicate: selectedIncome.id,
        source: selectedIncome.source || '',
        amount: selectedIncome.amount.toString(),
      },
    });
  };

  const handleCreateTemplate = () => {
    if (!selectedIncome) return;
    handleCloseActionSheet();
    router.push({
      pathname: '/(tabs)/incomes/templates/new',
      params: {
        source: selectedIncome.source || '',
        amount: selectedIncome.amount.toString(),
      },
    });
  };

  const handleDelete = () => {
    if (!selectedIncome) return;
    handleCloseActionSheet();

    Alert.alert(
      'Zmazat prijem',
      `Naozaj chcete zmazat prijem ${formatCurrency(selectedIncome.amount)}?`,
      [
        { text: 'Zrusit', style: 'cancel' },
        {
          text: 'Zmazat',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIncome(selectedIncome.id);
              setIncomes((prev) => prev.filter((i) => i.id !== selectedIncome.id));
              setToast({
                visible: true,
                message: 'Prijem bol zmazany',
                type: 'success',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              setToast({
                visible: true,
                message: 'Nepodarilo sa zmazat prijem',
                type: 'error',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const handleAddIncome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/incomes/new');
  };

  const handleTemplates = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/incomes/templates');
  };

  const renderIncomeItem = ({ item }: { item: Income }) => (
    <IncomeListItem
      income={item}
      onPress={() => handleIncomePress(item.id)}
      onLongPress={() => handleIncomeLongPress(item)}
    />
  );

  const getPeriodLabel = () => {
    switch (filterPeriod) {
      case 'this_month':
        return 'Tento mesiac';
      case 'last_month':
        return 'Minuly mesiac';
      default:
        return 'Celkovo';
    }
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Hero Card */}
      {incomes.length > 0 && (
        <IncomeHeroCard
          totalIncome={totalIncome}
          incomeCount={incomeCount}
          recurringCount={recurringCount}
          percentChange={percentChange}
          periodLabel={getPeriodLabel()}
        />
      )}

      {/* Filter Segment */}
      {incomes.length > 0 && (
        <View style={styles.filterSection}>
          <SegmentControl
            options={filterOptions}
            value={filterPeriod}
            onChange={setFilterPeriod}
            size="md"
          />
        </View>
      )}

      {/* Sort Row */}
      {incomes.length > 0 && (
        <View style={styles.sortRow}>
          <Text style={[styles.sortLabel, { color: colors.textSecondary }]}>
            Zoradit:
          </Text>
          <View style={styles.sortButtons}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                {
                  backgroundColor:
                    sortBy === 'date' ? colors.primaryLight : colors.surfacePressed,
                  borderColor: sortBy === 'date' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSortBy('date')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  {
                    color: sortBy === 'date' ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                Datum
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                {
                  backgroundColor:
                    sortBy === 'amount' ? colors.primaryLight : colors.surfacePressed,
                  borderColor: sortBy === 'amount' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSortBy('amount')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  {
                    color: sortBy === 'amount' ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                Suma
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                {
                  backgroundColor:
                    sortBy === 'source' ? colors.primaryLight : colors.surfacePressed,
                  borderColor: sortBy === 'source' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSortBy('source')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  {
                    color: sortBy === 'source' ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                Zdroj
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Results count */}
      {incomes.length > 0 && sortedIncomes.length > 0 && (
        <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
          {sortedIncomes.length}{' '}
          {sortedIncomes.length === 1
            ? 'prijem'
            : sortedIncomes.length < 5
            ? 'prijmy'
            : 'prijmov'}
        </Text>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View
        style={[styles.emptyIconContainer, { backgroundColor: colors.incomeLight }]}
      >
        <Text style={styles.emptyIcon}>💵</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {filterPeriod === 'this_month'
          ? 'Ziadne prijmy tento mesiac'
          : filterPeriod === 'last_month'
          ? 'Ziadne prijmy minuly mesiac'
          : 'Zatial nemate ziadne prijmy'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {filterPeriod !== 'all'
          ? 'Skuste zmenit filter obdobia'
          : 'Pridajte svoj prvy prijem a zacnite sledovat financie'}
      </Text>
      {filterPeriod === 'all' && (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={handleAddIncome}
        >
          <Plus size={20} color={colors.textInverse} />
          <Text style={[styles.emptyButtonText, { color: colors.textInverse }]}>
            Pridat prvy prijem
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + 16, backgroundColor: colors.surface },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Prijmy</Text>
        </View>
        <View style={styles.content}>
          <View style={{ padding: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorMessage message={error} onRetry={loadIncomes} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Prijmy</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.templateButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            onPress={handleTemplates}
          >
            <FileText size={18} color={colors.primary} />
            <Text style={[styles.templateButtonText, { color: colors.primary }]}>
              Sablony
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.income }]}
            onPress={handleAddIncome}
          >
            <Plus size={20} color={colors.textInverse} />
            <Text style={[styles.addButtonText, { color: colors.textInverse }]}>
              Pridat
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={sortedIncomes}
        keyExtractor={(item) => item.id}
        renderItem={renderIncomeItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          sortedIncomes.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      {/* Action Sheet */}
      <IncomeActionSheet
        visible={actionSheetVisible}
        incomeName={selectedIncome?.source || 'Prijem'}
        incomeAmount={selectedIncome ? formatCurrency(selectedIncome.amount) : undefined}
        onView={handleView}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onCreateTemplate={handleCreateTemplate}
        onDelete={handleDelete}
        onClose={handleCloseActionSheet}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
  },
  templateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 16,
  },
  filterSection: {
    marginTop: 20,
  },
  sortRow: {
    marginTop: 16,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultsCount: {
    marginTop: 16,
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
