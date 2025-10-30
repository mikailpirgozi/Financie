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
import { useRouter, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { getExpenses, getCurrentHousehold, deleteExpense, type Expense } from '../../src/lib/api';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import * as Haptics from 'expo-haptics';

interface GroupedExpenses {
  date: string;
  expenses: Expense[];
  total: number;
}

export default function ExpensesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

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
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať výdavky');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    setRefreshing(false);
  };

  const handleDelete = async (expense: Expense) => {
    Alert.alert(
      'Zmazať výdavok',
      `Naozaj chcete zmazať výdavok ${formatCurrency(expense.amount)}?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpense(expense.id);
              setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
              showToast('Výdavok bol zmazaný', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              showToast('Nepodarilo sa zmazať výdavok', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const groupByDate = (expenses: Expense[]): GroupedExpenses[] => {
    const filtered = searchQuery
      ? expenses.filter(
          (e) =>
            e.merchant?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.note?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : expenses;

    const grouped = filtered.reduce((acc, expense) => {
      const date = new Date(expense.date).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, expenses: [], total: 0 };
      }
      acc[date].expenses.push(expense);
      acc[date].total += expense.amount;
      return acc;
    }, {} as Record<string, GroupedExpenses>);

    return Object.values(grouped).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const renderRightActions = (expense: Expense) => {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.editAction]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/(tabs)/expenses/${expense.id}/edit`);
          }}
        >
          <Text style={styles.swipeActionText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleDelete(expense);
          }}
        >
          <Text style={styles.swipeActionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => {
    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <Card
          onPress={() => router.push(`/(tabs)/expenses/${item.id}`)}
          style={styles.expenseCard}
        >
          <View style={styles.expenseHeader}>
            <View style={styles.expenseInfo}>
              <Text style={styles.merchant}>{item.merchant || 'Výdavok'}</Text>
              {item.note && (
                <Text style={styles.note} numberOfLines={1}>
                  {item.note}
                </Text>
              )}
            </View>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          </View>
        </Card>
      </Swipeable>
    );
  };

  const renderGroup = ({ item }: { item: GroupedExpenses }) => {
    return (
      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupDate}>{formatDate(item.date)}</Text>
          <Badge variant="default">{formatCurrency(item.total)}</Badge>
        </View>
        {item.expenses.map((expense) => (
          <View key={expense.id}>{renderExpenseItem({ item: expense })}</View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Výdavky</Text>
        </View>
        <View style={styles.content}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error} onRetry={loadExpenses} />
      </View>
    );
  }

  const groupedExpenses = groupByDate(expenses);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Výdavky</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(tabs)/expenses/new')}
          >
            <Text style={styles.addButtonText}>+ Pridať</Text>
          </TouchableOpacity>
        </View>
        {expenses.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Celkovo:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalExpenses)}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {expenses.length > 0 && (
          <Input
            placeholder="Hľadať výdavky..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            showClearButton
            onClear={() => setSearchQuery('')}
            containerStyle={styles.searchInput}
          />
        )}

        {groupedExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💸</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Žiadne výsledky' : 'Zatiaľ nemáte žiadne výdavky'}
            </Text>
            {!searchQuery && (
              <Button
                onPress={() => router.push('/(tabs)/expenses/new')}
                style={{ marginTop: 16 }}
              >
                Pridať prvý výdavok
              </Button>
            )}
          </View>
        ) : (
          <FlatList
            data={groupedExpenses}
            keyExtractor={(item) => item.date}
            renderItem={renderGroup}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#0070f3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
  },
  content: {
    flex: 1,
  },
  searchInput: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
  },
  list: {
    padding: 16,
  },
  group: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  groupDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  expenseCard: {
    marginBottom: 8,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
    marginRight: 12,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  note: {
    fontSize: 14,
    color: '#6b7280',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ef4444',
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginLeft: 8,
    borderRadius: 12,
  },
  editAction: {
    backgroundColor: '#0070f3',
  },
  deleteAction: {
    backgroundColor: '#ef4444',
  },
  swipeActionText: {
    fontSize: 24,
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

