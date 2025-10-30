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
import { getIncomes, getCurrentHousehold, deleteIncome, type Income } from '../../src/lib/api';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import * as Haptics from 'expo-haptics';

interface GroupedIncomes {
  month: string;
  incomes: Income[];
  total: number;
}

export default function IncomesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

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
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať príjmy');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncomes();
    setRefreshing(false);
  };

  const handleDelete = async (income: Income) => {
    Alert.alert(
      'Zmazať príjem',
      `Naozaj chcete zmazať príjem ${formatCurrency(income.amount)}?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteIncome(income.id);
              setIncomes((prev) => prev.filter((i) => i.id !== income.id));
              showToast('Príjem bol zmazaný', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              showToast('Nepodarilo sa zmazať príjem', 'error');
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

  const formatMonth = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
    });
  };

  const groupByMonth = (incomes: Income[]): GroupedIncomes[] => {
    const filtered = searchQuery
      ? incomes.filter(
          (i) =>
            i.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.note?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : incomes;

    const grouped = filtered.reduce((acc, income) => {
      const date = new Date(income.date);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!acc[month]) {
        acc[month] = { month, incomes: [], total: 0 };
      }
      acc[month].incomes.push(income);
      acc[month].total += income.amount;
      return acc;
    }, {} as Record<string, GroupedIncomes>);

    return Object.values(grouped).sort((a, b) => b.month.localeCompare(a.month));
  };

  const renderRightActions = (income: Income) => {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.editAction]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push(`/(tabs)/incomes/${income.id}/edit`);
          }}
        >
          <Text style={styles.swipeActionText}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            handleDelete(income);
          }}
        >
          <Text style={styles.swipeActionText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderIncomeItem = ({ item }: { item: Income }) => {
    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <Card
          onPress={() => router.push(`/(tabs)/incomes/${item.id}`)}
          style={styles.incomeCard}
        >
          <View style={styles.incomeHeader}>
            <View style={styles.incomeInfo}>
              <Text style={styles.source}>{item.source || 'Príjem'}</Text>
              <Text style={styles.date}>{formatDate(item.date)}</Text>
            </View>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          </View>
        </Card>
      </Swipeable>
    );
  };

  const renderGroup = ({ item }: { item: GroupedIncomes }) => {
    return (
      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupMonth}>{formatMonth(item.incomes[0].date)}</Text>
          <Badge variant="success">{formatCurrency(item.total)}</Badge>
        </View>
        {item.incomes.map((income) => (
          <View key={income.id}>{renderIncomeItem({ item: income })}</View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Príjmy</Text>
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
        <ErrorMessage message={error} onRetry={loadIncomes} />
      </View>
    );
  }

  const groupedIncomes = groupByMonth(incomes);
  const totalIncomes = incomes.reduce((sum, i) => sum + i.amount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Príjmy</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.templateButton}
              onPress={() => router.push('/(tabs)/incomes/templates')}
            >
              <Text style={styles.templateButtonText}>📋 Šablóny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/(tabs)/incomes/new')}
            >
              <Text style={styles.addButtonText}>+ Pridať</Text>
            </TouchableOpacity>
          </View>
        </View>
        {incomes.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Celkovo:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalIncomes)}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {incomes.length > 0 && (
          <Input
            placeholder="Hľadať príjmy..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            showClearButton
            onClear={() => setSearchQuery('')}
            containerStyle={styles.searchInput}
          />
        )}

        {groupedIncomes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💵</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Žiadne výsledky' : 'Zatiaľ nemáte žiadne príjmy'}
            </Text>
            {!searchQuery && (
              <Button
                onPress={() => router.push('/(tabs)/incomes/new')}
                style={{ marginTop: 16 }}
              >
                Pridať prvý príjem
              </Button>
            )}
          </View>
        ) : (
          <FlatList
            data={groupedIncomes}
            keyExtractor={(item) => item.month}
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
    backgroundColor: '#10b981',
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
    color: '#10b981',
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
  groupMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  incomeCard: {
    marginBottom: 8,
  },
  incomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  incomeInfo: {
    flex: 1,
    marginRight: 12,
  },
  source: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
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
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  templateButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  templateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

