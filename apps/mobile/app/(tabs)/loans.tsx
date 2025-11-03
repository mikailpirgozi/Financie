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
type SortBy = 'next_payment' | 'balance' | 'monthly_payment' | 'overdue';

export default function LoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortBy>('next_payment');
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

  // Sort loans
  const sortedLoans = [...filteredLoans].sort((a, b) => {
    switch (sortBy) {
      case 'overdue':
        // Overdue first, then by overdue count
        const aOverdue = a.overdue_count || 0;
        const bOverdue = b.overdue_count || 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        return 0;
      
      case 'next_payment':
        // Sort by next payment date (earliest first)
        if (!a.next_payment_due_date && !b.next_payment_due_date) return 0;
        if (!a.next_payment_due_date) return 1;
        if (!b.next_payment_due_date) return -1;
        return new Date(a.next_payment_due_date).getTime() - new Date(b.next_payment_due_date).getTime();
      
      case 'balance':
        // Highest balance first
        const aBalance = typeof a.remaining_balance === 'string' ? parseFloat(a.remaining_balance) : a.remaining_balance;
        const bBalance = typeof b.remaining_balance === 'string' ? parseFloat(b.remaining_balance) : b.remaining_balance;
        return bBalance - aBalance;
      
      case 'monthly_payment':
        // Highest monthly payment first
        const aPayment = typeof a.monthly_payment === 'string' ? parseFloat(a.monthly_payment) : a.monthly_payment;
        const bPayment = typeof b.monthly_payment === 'string' ? parseFloat(b.monthly_payment) : b.monthly_payment;
        return bPayment - aPayment;
      
      default:
        return 0;
    }
  });

  const totalRemaining = loans
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => {
      const balance = typeof l.remaining_balance === 'string' ? parseFloat(l.remaining_balance) : l.remaining_balance;
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);

  // Calculate quick stats
  const totalOverdueCount = loans.reduce((sum, l) => sum + (l.overdue_count || 0), 0);
  
  // Count installments due this month (approximate from next_payment_due_date)
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const paymentsThisMonth = loans.filter(l => {
    if (!l.next_payment_due_date) return false;
    const dueDate = new Date(l.next_payment_due_date);
    return dueDate >= today && dueDate <= endOfMonth;
  }).length;

  const renderLoanCard = ({ item }: { item: Loan }) => {
    const progress = calculateProgress(item);
    const hasOverdue = (item.overdue_count || 0) > 0;
    
    // Check if payment is due soon (within 5 days)
    const today = new Date();
    const fiveDaysFromNow = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000);
    const isDueSoon = item.next_payment_due_date && 
                      !hasOverdue && 
                      new Date(item.next_payment_due_date) >= today && 
                      new Date(item.next_payment_due_date) <= fiveDaysFromNow;

    // Determine card accent color based on status
    const accentColor = hasOverdue ? '#dc2626' : isDueSoon ? '#f59e0b' : '#8b5cf6';

    return (
      <Card
        style={[styles.loanCard, { width: CARD_WIDTH }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/(tabs)/loans/${item.id}`);
        }}
      >
        {/* Accent border top */}
        <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
        
        <View style={styles.cardHeader}>
          <View style={styles.lenderContainer}>
            <View style={styles.lenderRow}>
              {(hasOverdue || isDueSoon) && (
                <Text style={styles.warningIcon}>
                  {hasOverdue ? '⚠️' : '📅'}
                </Text>
              )}
              <Text style={styles.lenderName} numberOfLines={2}>
                {item.name || item.lender}
              </Text>
            </View>
            {item.name && (
              <Text style={styles.sublender} numberOfLines={2}>
                {item.lender}
              </Text>
            )}
          </View>
          <Badge variant={getStatusBadgeVariant(item.status)}>
            {getStatusLabel(item.status)}
          </Badge>
        </View>

        {/* Main amount - much more prominent */}
        <View style={styles.amountSection}>
          <View style={styles.remainingBalanceRow}>
            <Text style={styles.balanceLabel}>Zostatok</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(item.remaining_balance)}</Text>
          </View>
          <View style={styles.monthlyPaymentRow}>
            <Text style={styles.monthlyLabel}>💳</Text>
            <Text style={styles.monthlyValue}>{formatCurrency(item.monthly_payment)}</Text>
            <Text style={styles.monthlyPeriod}>/mes</Text>
          </View>
        </View>

        {/* Next payment or overdue warning */}
        {item.status === 'active' && (
          hasOverdue ? (
            <View style={styles.alertBoxDanger}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.alertTextDanger}>
                {item.overdue_count} {item.overdue_count === 1 ? 'splátka po splatnosti' : 'splátok po splatnosti'}
              </Text>
            </View>
          ) : isDueSoon ? (
            <View style={styles.alertBoxWarning}>
              <Text style={styles.alertIcon}>📅</Text>
              <Text style={styles.alertTextWarning}>
                Splátka do {Math.ceil((new Date(item.next_payment_due_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} {
                  Math.ceil((new Date(item.next_payment_due_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) === 1 ? 'dňa' : 'dní'
                }
              </Text>
            </View>
          ) : item.next_payment_due_date && (
            <View style={styles.nextPaymentRow}>
              <Text style={styles.nextPaymentLabel}>Ďalšia splátka</Text>
              <Text style={styles.nextPaymentValue}>
                {new Date(item.next_payment_due_date).toLocaleDateString('sk-SK', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          )
        )}

        {/* Enhanced Progress Bar with gradient */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(progress, 100)}%`,
                },
              ]}
            >
              {progress > 0 && (
                <View style={[
                  styles.progressGradient,
                  { backgroundColor: item.status === 'paid_off' ? '#10b981' : accentColor }
                ]} />
              )}
            </View>
          </View>
          <Text style={styles.progressPercentage}>{Math.round(progress)}%</Text>
        </View>
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
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Celkový zostatok:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totalRemaining)}</Text>
            </View>
            
            {/* Quick stats */}
            {(paymentsThisMonth > 0 || totalOverdueCount > 0) && (
              <View style={styles.quickStatsRow}>
                {paymentsThisMonth > 0 && (
                  <View style={styles.quickStat}>
                    <Text style={styles.quickStatIcon}>📅</Text>
                    <Text style={styles.quickStatText}>
                      {paymentsThisMonth} {paymentsThisMonth === 1 ? 'splátka' : 'splátky'} tento mesiac
                    </Text>
                  </View>
                )}
                {totalOverdueCount > 0 && (
                  <View style={[styles.quickStat, styles.quickStatWarning]}>
                    <Text style={styles.quickStatIcon}>⚠️</Text>
                    <Text style={styles.quickStatTextWarning}>
                      {totalOverdueCount} po splatnosti
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {loans.length > 0 && (
          <>
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

            {/* Sorting */}
            <View style={styles.sortContainer}>
              <Text style={styles.sortLabel}>Triediť:</Text>
              <View style={styles.sortButtons}>
                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'next_payment' && styles.sortButtonActive]}
                  onPress={() => setSortBy('next_payment')}
                >
                  <Text style={[styles.sortText, sortBy === 'next_payment' && styles.sortTextActive]}>
                    Splátka
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'overdue' && styles.sortButtonActive]}
                  onPress={() => setSortBy('overdue')}
                >
                  <Text style={[styles.sortText, sortBy === 'overdue' && styles.sortTextActive]}>
                    Po splatnosti
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortButton, sortBy === 'balance' && styles.sortButtonActive]}
                  onPress={() => setSortBy('balance')}
                >
                  <Text style={[styles.sortText, sortBy === 'balance' && styles.sortTextActive]}>
                    Zostatok
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.content}>
        {sortedLoans.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>
              {filterStatus === 'paid_off' ? '🎉' : '💰'}
            </Text>
            <Text style={styles.emptyTitle}>
              {filterStatus === 'paid_off' ? 'Žiadne splatené úvery' : 'Zatiaľ nemáte žiadne úvery'}
            </Text>
            <Text style={styles.emptyText}>
              {filterStatus === 'paid_off'
                ? 'Splatené úvery sa zobrazia tu'
                : filterStatus === 'active'
                ? 'Žiadne aktívne úvery'
                : 'Pridajte svoj prvý úver a začnite sledovať splátky'}
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
            data={sortedLoans}
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
    backgroundColor: '#fafafa',
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
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  addButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  summaryCard: {
    marginBottom: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8b5cf6',
    letterSpacing: -0.5,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 6,
  },
  quickStatWarning: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  quickStatIcon: {
    fontSize: 16,
  },
  quickStatText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  quickStatTextWarning: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '700',
    flex: 1,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  sortContainer: {
    marginTop: 8,
  },
  sortLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sortButtonActive: {
    backgroundColor: '#f5f3ff',
    borderColor: '#a78bfa',
  },
  sortText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  sortTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
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
    padding: 0,
    marginBottom: 0,
    overflow: 'hidden',
    // Enhanced shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAccent: {
    height: 3,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 14,
    marginHorizontal: 14,
    marginBottom: 12,
    minHeight: 44,
  },
  lenderContainer: {
    flex: 1,
    marginRight: 10,
  },
  lenderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  warningIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  lenderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  sublender: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 14,
  },
  amountSection: {
    marginHorizontal: 14,
    marginBottom: 12,
  },
  remainingBalanceRow: {
    marginBottom: 6,
  },
  balanceLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  monthlyPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  monthlyLabel: {
    fontSize: 13,
  },
  monthlyValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },
  monthlyPeriod: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  alertBoxDanger: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertBoxWarning: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  alertIcon: {
    fontSize: 14,
  },
  alertTextDanger: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    flex: 1,
  },
  alertTextWarning: {
    fontSize: 12,
    color: '#d97706',
    fontWeight: '600',
    flex: 1,
  },
  nextPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 12,
    paddingVertical: 6,
  },
  nextPaymentLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  nextPaymentValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  progressSection: {
    marginTop: 4,
    marginBottom: 14,
    marginHorizontal: 14,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressGradient: {
    height: '100%',
    width: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'right',
    fontWeight: '600',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

