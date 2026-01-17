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
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { getExpenses, getCurrentHousehold, deleteExpense, type Expense } from '../../src/lib/api';
import { useTheme } from '../../src/contexts';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Toast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { SegmentControl, SegmentOption } from '@/components/ui/SegmentControl';
import { ExpenseHeroCard } from '../../src/components/expenses/ExpenseHeroCard';
import { ExpenseListItem } from '../../src/components/expenses/ExpenseListItem';
import { ExpenseActionSheet } from '../../src/components/expenses/ExpenseActionSheet';

type FilterPeriod = 'all' | 'this_month' | 'last_month';
type SortBy = 'date' | 'amount' | 'category';

export default function ExpensesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [])
  );

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const expensesData = await getExpenses(household.id);
      setExpenses(expensesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa nacitat vydavky');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  // Filter expenses by period
  const getFilteredExpenses = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses.filter((expense) => {
      if (filterPeriod === 'all') return true;

      const expenseDate = new Date(expense.date);
      const expenseMonth = expenseDate.getMonth();
      const expenseYear = expenseDate.getFullYear();

      if (filterPeriod === 'this_month') {
        return expenseMonth === currentMonth && expenseYear === currentYear;
      }

      if (filterPeriod === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return expenseMonth === lastMonth && expenseYear === lastMonthYear;
      }

      return true;
    });
  };

  // Sort expenses
  const getSortedExpenses = (filtered: Expense[]) => {
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'category':
          const catA = a.category?.name || '';
          const catB = b.category?.name || '';
          return catA.localeCompare(catB);
        case 'date':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  };

  const filteredExpenses = getFilteredExpenses();
  const sortedExpenses = getSortedExpenses(filteredExpenses);

  // Calculate stats
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseCount = filteredExpenses.length;

  // Calculate percent change (this month vs last month)
  const calculatePercentChange = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const thisMonthTotal = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    const lastMonthTotal = expenses
      .filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((sum, e) => sum + e.amount, 0);

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
  const handleExpensePress = (expenseId: string) => {
    router.push(`/(tabs)/expenses/${expenseId}`);
  };

  const handleExpenseLongPress = (expense: Expense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedExpense(expense);
    setActionSheetVisible(true);
  };

  const handleCloseActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedExpense(null);
  };

  const handleView = () => {
    if (!selectedExpense) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/expenses/${selectedExpense.id}`);
  };

  const handleEdit = () => {
    if (!selectedExpense) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/expenses/${selectedExpense.id}/edit`);
  };

  const handleDuplicate = () => {
    if (!selectedExpense) return;
    handleCloseActionSheet();
    // Navigate to new expense with pre-filled data
    router.push({
      pathname: '/(tabs)/expenses/new',
      params: {
        duplicate: selectedExpense.id,
        merchant: selectedExpense.merchant || '',
        amount: selectedExpense.amount.toString(),
        category_id: selectedExpense.category_id || '',
      },
    });
  };

  const handleChangeCategory = () => {
    if (!selectedExpense) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/expenses/${selectedExpense.id}/edit`);
  };

  const handleDelete = () => {
    if (!selectedExpense) return;
    handleCloseActionSheet();

    Alert.alert(
      'Zmazat vydavok',
      `Naozaj chcete zmazat vydavok ${formatCurrency(selectedExpense.amount)}?`,
      [
        { text: 'Zrusit', style: 'cancel' },
        {
          text: 'Zmazat',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(selectedExpense.id);
              setExpenses((prev) => prev.filter((e) => e.id !== selectedExpense.id));
              setToast({
                visible: true,
                message: 'Vydavok bol zmazany',
                type: 'success',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              setToast({
                visible: true,
                message: 'Nepodarilo sa zmazat vydavok',
                type: 'error',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const handleAddExpense = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/expenses/new');
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <ExpenseListItem
      expense={item}
      onPress={() => handleExpensePress(item.id)}
      onLongPress={() => handleExpenseLongPress(item)}
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
      {expenses.length > 0 && (
        <ExpenseHeroCard
          totalExpenses={totalExpenses}
          expenseCount={expenseCount}
          percentChange={percentChange}
          periodLabel={getPeriodLabel()}
        />
      )}

      {/* Filter Segment */}
      {expenses.length > 0 && (
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
      {expenses.length > 0 && (
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
                    sortBy === 'category' ? colors.primaryLight : colors.surfacePressed,
                  borderColor: sortBy === 'category' ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSortBy('category')}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  {
                    color: sortBy === 'category' ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                Kategoria
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Results count */}
      {expenses.length > 0 && sortedExpenses.length > 0 && (
        <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
          {sortedExpenses.length}{' '}
          {sortedExpenses.length === 1
            ? 'vydavok'
            : sortedExpenses.length < 5
            ? 'vydavky'
            : 'vydavkov'}
        </Text>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View
        style={[styles.emptyIconContainer, { backgroundColor: colors.expenseLight }]}
      >
        <Text style={styles.emptyIcon}>💸</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {filterPeriod === 'this_month'
          ? 'Ziadne vydavky tento mesiac'
          : filterPeriod === 'last_month'
          ? 'Ziadne vydavky minuly mesiac'
          : 'Zatial nemate ziadne vydavky'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {filterPeriod !== 'all'
          ? 'Skuste zmenit filter obdobia'
          : 'Pridajte svoj prvy vydavok a zacnite sledovat financie'}
      </Text>
      {filterPeriod === 'all' && (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={handleAddExpense}
        >
          <Plus size={20} color={colors.textInverse} />
          <Text style={[styles.emptyButtonText, { color: colors.textInverse }]}>
            Pridat prvy vydavok
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
          <Text style={[styles.title, { color: colors.text }]}>Vydavky</Text>
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
        <ErrorMessage message={error} onRetry={loadExpenses} />
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
        <Text style={[styles.title, { color: colors.text }]}>Vydavky</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.expense }]}
          onPress={handleAddExpense}
        >
          <Plus size={20} color={colors.textInverse} />
          <Text style={[styles.addButtonText, { color: colors.textInverse }]}>
            Pridat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={sortedExpenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
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
          sortedExpenses.length === 0 && styles.listContentEmpty,
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
      <ExpenseActionSheet
        visible={actionSheetVisible}
        expenseName={selectedExpense?.merchant || 'Vydavok'}
        expenseAmount={selectedExpense ? formatCurrency(selectedExpense.amount) : undefined}
        onView={handleView}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onChangeCategory={handleChangeCategory}
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#EF4444',
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
