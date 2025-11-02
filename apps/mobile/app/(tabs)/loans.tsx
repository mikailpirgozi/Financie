import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getLoans, getCurrentHousehold, type Loan } from '../../src/lib/api';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const CARD_PADDING = 16;
const CARD_GAP = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (width - CARD_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

type FilterStatus = 'all' | 'active' | 'paid_off';

export default function LoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useFocusEffect(
    useCallback(() => {
      loadLoans();
    }, [])
  );

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLoans();
    setRefreshing(false);
  };


  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0 €';
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'success' | 'warning' => {
    if (status === 'paid_off') return 'success';
    if (status === 'active') return 'default';
    return 'warning';
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'paid_off') return 'Splatený';
    if (status === 'active') return 'Aktívny';
    return status;
  };

  const calculateProgress = (loan: Loan): number => {
    const principal = typeof loan.principal === 'string' ? parseFloat(loan.principal) : loan.principal;
    const amountPaid = typeof loan.amount_paid === 'string' ? parseFloat(loan.amount_paid) : loan.amount_paid;
    if (principal === 0 || isNaN(principal) || isNaN(amountPaid)) return 0;
    return (amountPaid / principal) * 100;
  };

  const filteredLoans = loans.filter((loan) => {
    if (filterStatus === 'all') return true;
    return loan.status === filterStatus;
  });

  const totalRemaining = loans
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => {
      const balance = typeof l.remaining_balance === 'string' ? parseFloat(l.remaining_balance) : l.remaining_balance;
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);

  const renderLoanCard = ({ item }: { item: Loan }) => {
    const progress = calculateProgress(item);

    return (
      <Card
        style={[styles.loanCard, { width: CARD_WIDTH }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/(tabs)/loans/${item.id}`);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.lender} numberOfLines={1}>
            {item.lender}
          </Text>
          <Badge variant={getStatusBadgeVariant(item.status)}>
            {getStatusLabel(item.status)}
          </Badge>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.remainingLabel}>Zostáva</Text>
          <Text style={styles.remainingAmount}>
            {formatCurrency(item.remaining_balance)}
          </Text>
          <Text style={styles.totalLabel}>
            z {formatCurrency(item.principal)}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor:
                    item.status === 'paid_off' ? '#10b981' : '#0070f3',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        {item.next_payment_due_date && item.status === 'active' && (
          <View style={styles.nextPayment}>
            <Text style={styles.nextPaymentLabel}>Ďalšia splátka</Text>
            <Text style={styles.nextPaymentDate}>
              {new Date(item.next_payment_due_date).toLocaleDateString('sk-SK', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>Úvery</Text>
        </View>
        <View style={styles.content}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error} onRetry={loadLoans} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Úvery</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(tabs)/loans/new')}
          >
            <Text style={styles.addButtonText}>+ Pridať</Text>
          </TouchableOpacity>
        </View>

        {loans.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Celkový zostatok:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalRemaining)}</Text>
          </View>
        )}

        {loans.length > 0 && (
          <View style={styles.filters}>
            <TouchableOpacity
              style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
              onPress={() => setFilterStatus('all')}
            >
              <Text
                style={[styles.filterText, filterStatus === 'all' && styles.filterTextActive]}
              >
                Všetky ({loans.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'active' && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatus('active')}
            >
              <Text
                style={[
                  styles.filterText,
                  filterStatus === 'active' && styles.filterTextActive,
                ]}
              >
                Aktívne ({loans.filter((l) => l.status === 'active').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filterStatus === 'paid_off' && styles.filterButtonActive,
              ]}
              onPress={() => setFilterStatus('paid_off')}
            >
              <Text
                style={[
                  styles.filterText,
                  filterStatus === 'paid_off' && styles.filterTextActive,
                ]}
              >
                Splatené ({loans.filter((l) => l.status === 'paid_off').length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {filteredLoans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>
              {filterStatus === 'all'
                ? 'Zatiaľ nemáte žiadne úvery'
                : 'Žiadne úvery v tejto kategórii'}
            </Text>
            {filterStatus === 'all' && (
              <Button
                onPress={() => router.push('/(tabs)/loans/new')}
                style={{ marginTop: 16 }}
              >
                Pridať prvý úver
              </Button>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredLoans}
            keyExtractor={(item) => item.id}
            renderItem={renderLoanCard}
            numColumns={NUM_COLUMNS}
            columnWrapperStyle={styles.row}
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
    paddingHorizontal: CARD_PADDING,
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
    backgroundColor: '#8b5cf6',
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
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  filterText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  list: {
    padding: CARD_PADDING,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  loanCard: {
    padding: 12,
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  amountSection: {
    marginBottom: 12,
  },
  remainingLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  remainingAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8b5cf6',
    marginBottom: 2,
  },
  totalLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'right',
  },
  nextPayment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  nextPaymentLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  nextPaymentDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
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

