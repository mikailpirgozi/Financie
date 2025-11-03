import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLoan, markLoanInstallmentPaid, markLoanPaidUntilToday, type Loan } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { SwipeableInstallmentCard } from '@/components/loans/SwipeableInstallmentCard';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { OptionsMenu, type MenuItem } from '@/components/ui/OptionsMenu';
import * as Haptics from 'expo-haptics';

interface LoanScheduleEntry {
  id: string;
  loan_id: string;
  installment_no: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  fees_due: string;
  total_due: string;
  principal_balance_after: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
}

export default function LoanDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<LoanScheduleEntry[]>([]);
  const [optimisticSchedule, setOptimisticSchedule] = useState<LoanScheduleEntry[]>([]);
  const [showPaidInstallments, setShowPaidInstallments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    loadLoan();
  }, [id]);

  const loadLoan = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Loading loan detail:', id);

      // Fetch loan using API (includes computed fields)
      const { loan: loanData } = await getLoan(id!);

      console.log('✅ Loan loaded:', {
        id: loanData.id,
        lender: loanData.lender,
        principal: loanData.principal,
        remaining_balance: loanData.remaining_balance,
        amount_paid: loanData.amount_paid,
      });

      setLoan(loanData);

      // Fetch schedule from loan_schedules table
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('loan_schedules')
        .select('*')
        .eq('loan_id', id)
        .order('installment_no', { ascending: true });

      if (scheduleError) {
        console.warn('⚠️ Failed to load schedule:', scheduleError);
      }

      // Mark overdue entries
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const scheduleWithStatus = (scheduleData || []).map((entry) => {
        if (entry.status === 'paid') return entry;
        const dueDate = new Date(entry.due_date);
        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          return { ...entry, status: 'overdue' as const };
        }
        return entry;
      });

      setSchedule(scheduleWithStatus);
      setOptimisticSchedule(scheduleWithStatus);
    } catch (err) {
      console.error('❌ Failed to load loan:', err);
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať úver');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInstallmentPaid = async (installmentId: string) => {
    // Optimistic update
    setOptimisticSchedule((prev) =>
      prev.map((entry) =>
        entry.id === installmentId
          ? { ...entry, status: 'paid', paid_at: new Date().toISOString() }
          : entry
      )
    );

    try {
      await markLoanInstallmentPaid(id!, installmentId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Splátka označená ako uhradená', 'success');
    } catch (error) {
      // Rollback on error
      setOptimisticSchedule(schedule);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Nepodarilo sa označiť splátku', 'error');
      console.error('Failed to mark installment:', error);
    } finally {
      // Refresh data
      await loadLoan();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLoan();
    setRefreshing(false);
  };

  const handleMarkAllUntilToday = async () => {
    const today = new Date().toISOString().split('T')[0];

    const pendingCount = schedule.filter(
      (entry) =>
        (entry.status === 'pending' || entry.status === 'overdue') &&
        entry.due_date <= today
    ).length;

    if (pendingCount === 0) {
      Alert.alert('Info', 'Žiadne splátky na označenie');
      return;
    }

    Alert.alert(
      'Potvrdiť úhradu',
      `Naozaj chcete označiť ${pendingCount} ${pendingCount === 1 ? 'splátku' : 'splátok'} ako ${pendingCount === 1 ? 'uhradenú' : 'uhradené'}?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Potvrdiť',
          onPress: async () => {
            try {
              await markLoanPaidUntilToday(id!, today);
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
              showToast(`${pendingCount} ${pendingCount === 1 ? 'splátka označená' : 'splátok označených'}!`, 'success');
              await loadLoan();
            } catch (error) {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
              );
              showToast('Nepodarilo sa označiť splátky', 'error');
              console.error('Failed to mark installments:', error);
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Zmazať úver',
      'Naozaj chcete zmazať tento úver?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('loans')
                .delete()
                .eq('id', id);

              if (error) throw error;

              showToast('Úver bol zmazaný', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              setTimeout(() => {
                router.back();
              }, 1500);
            } catch (error) {
              showToast('Nepodarilo sa zmazať úver', 'error');
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

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0,00 €';
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };


  const calculateProgress = (loan: Loan): number => {
    const principal = typeof loan.principal === 'string' ? parseFloat(loan.principal) : loan.principal;
    const amountPaid = typeof loan.amount_paid === 'string' ? parseFloat(loan.amount_paid) : loan.amount_paid;
    if (principal === 0 || isNaN(principal) || isNaN(amountPaid)) return 0;
    return (amountPaid / principal) * 100;
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'paid_off') return 'Splatený';
    if (status === 'active') return 'Aktívny';
    return status;
  };



  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </View>
    );
  }

  if (error || !loan) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Úver nebol nájdený'}</Text>
          <Button onPress={() => router.back()} variant="outline">
            Späť
          </Button>
        </View>
      </View>
    );
  }

  const progress = calculateProgress(loan);
  const paidInstallments = optimisticSchedule.filter((i) => i.status === 'paid').length;
  const totalInstallments = optimisticSchedule.length;
  
  // Smart display: show unpaid + last 1 paid (most recent)
  const unpaidSchedule = optimisticSchedule.filter((i) => i.status !== 'paid');
  const paidSchedule = optimisticSchedule.filter((i) => i.status === 'paid');
  const lastPaid = paidSchedule.length > 0 ? [paidSchedule[paidSchedule.length - 1]] : [];
  
  const displayedSchedule = showPaidInstallments
    ? optimisticSchedule
    : [...lastPaid, ...unpaidSchedule];
  
  // Count pending installments until today for bulk action
  const today = new Date().toISOString().split('T')[0];
  const pendingUntilTodayCount = optimisticSchedule.filter(
    (entry) =>
      (entry.status === 'pending' || entry.status === 'overdue') &&
      entry.due_date <= today
  ).length;

  // Smart FAB indicators
  const overdueCount = optimisticSchedule.filter(
    (entry) => entry.status === 'overdue'
  ).length;
  
  const dueTodayCount = optimisticSchedule.filter(
    (entry) => entry.status === 'pending' && entry.due_date === today
  ).length;

  // Menu options
  const menuOptions: MenuItem[] = [
    {
      label: 'Prepojiť s majetkom',
      icon: '🏠',
      onPress: () => router.push(`/(tabs)/loans/${id}/link-asset`),
    },
    {
      label: 'Simulovať scenáre',
      icon: '📊',
      onPress: () => router.push(`/(tabs)/loans/${id}/simulate`),
    },
    {
      label: 'Upraviť úver',
      icon: '✏️',
      onPress: () => router.push(`/(tabs)/loans/${id}/edit`),
    },
    {
      label: 'Predčasne splatiť',
      icon: '💰',
      onPress: () => router.push(`/(tabs)/loans/${id}/early-repayment`),
    },
    {
      label: 'Zmazať úver',
      icon: '🗑️',
      destructive: true,
      onPress: handleDelete,
    },
  ];

  return (
    <GestureHandlerRootView style={styles.gestureContainer}>
    <View style={styles.container}>
        {/* Header with menu */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {loan.name || loan.lender}
            </Text>
          </View>
          <OptionsMenu options={menuOptions} title="Akcie úveru" />
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
        >
        <View style={styles.content}>
          {/* Overview Card */}
          <Card style={styles.overviewCard}>
            <Text style={styles.lender}>{loan.name || loan.lender}</Text>
            {loan.name && <Text style={styles.sublender}>{loan.lender}</Text>}
            <Badge variant={loan.status === 'paid_off' ? 'success' : 'default'}>
              {getStatusLabel(loan.status)}
            </Badge>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.remainingLabel}>Zostáva</Text>
                  <Text style={styles.remainingAmount}>
                    {formatCurrency(loan.remaining_balance)}
                  </Text>
                </View>
                <View style={styles.alignRight}>
                  <Text style={styles.totalLabel}>Pôvodná suma</Text>
                  <Text style={styles.totalAmount}>{formatCurrency(loan.principal)}</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: loan.status === 'paid_off' ? '#10b981' : '#8b5cf6',
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progress)}% splatené
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{overdueCount}</Text>
                <Text style={styles.statLabel}>Po splatnosti</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(loan.monthly_payment)}</Text>
                <Text style={styles.statLabel}>Mesačná splátka</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalInstallments - paidInstallments}</Text>
                <Text style={styles.statLabel}>Zostáva splátok</Text>
              </View>
            </View>
          </Card>

          {/* Loan Details Card */}
          <Card>
            <Text style={styles.sectionTitle}>Detaily úveru</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Úroková sadzba</Text>
              <Text style={styles.detailValue}>{loan.rate}%</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Obdobie</Text>
              <Text style={styles.detailValue}>{loan.term} mesiacov</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Suma mesačnej splátky</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(loan.monthly_payment)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Zaplatené</Text>
              <Text style={styles.detailValue}>{formatCurrency(loan.amount_paid)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Začiatok úveru</Text>
              <Text style={styles.detailValue}>{formatDate(loan.start_date)}</Text>
            </View>

            {loan.end_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Koniec úveru</Text>
                <Text style={styles.detailValue}>{formatDate(loan.end_date)}</Text>
              </View>
            )}
          </Card>

          {/* Payment Schedule */}
          {optimisticSchedule.length > 0 && (
            <Card>
              <View style={styles.scheduleHeader}>
                <Text style={styles.sectionTitle}>Splátkový kalendár</Text>
                <Text style={styles.scheduleProgress}>
                  {paidInstallments} / {totalInstallments}
                </Text>
              </View>

              {/* Smart Context Hint */}
              {overdueCount > 0 && (
                <View style={[styles.contextHint, styles.contextHintDanger]}>
                  <Text style={styles.contextHintIcon}>⚠️</Text>
                  <Text style={styles.contextHintText}>
                    Máte {overdueCount} {overdueCount === 1 ? 'splátku' : 'splátok'} po splatnosti
                  </Text>
                </View>
              )}
              {overdueCount === 0 && dueTodayCount > 0 && (
                <View style={[styles.contextHint, styles.contextHintWarning]}>
                  <Text style={styles.contextHintIcon}>📅</Text>
                  <Text style={styles.contextHintText}>
                    Dnes je splatnosť {dueTodayCount} {dueTodayCount === 1 ? 'splátky' : 'splátok'}
                  </Text>
                </View>
              )}
              {overdueCount === 0 && dueTodayCount === 0 && paidInstallments === totalInstallments && (
                <View style={[styles.contextHint, styles.contextHintSuccess]}>
                  <Text style={styles.contextHintIcon}>✅</Text>
                  <Text style={styles.contextHintText}>
                    Všetky splátky uhradené
                  </Text>
                </View>
              )}
              {overdueCount === 0 && dueTodayCount === 0 && paidInstallments < totalInstallments && pendingUntilTodayCount === 0 && (
                <View style={[styles.contextHint, styles.contextHintSuccess]}>
                  <Text style={styles.contextHintIcon}>✓</Text>
                  <Text style={styles.contextHintText}>
                    Všetky splátky uhradené do dnes
                  </Text>
                </View>
              )}

              {/* Bulk Action Button */}
              {pendingUntilTodayCount > 0 && (
                <View style={styles.bulkActionContainer}>
                  <Button
                    onPress={handleMarkAllUntilToday}
                    variant="primary"
                    fullWidth
                  >
                    {`📅 Označiť ${pendingUntilTodayCount} ${pendingUntilTodayCount === 1 ? 'splátku' : 'splátok'} do dnes`}
                  </Button>
                </View>
              )}

              {displayedSchedule.map((entry) => (
                <SwipeableInstallmentCard
                  key={entry.id}
                  entry={entry}
                  onMarkPaid={handleMarkInstallmentPaid}
                  onEditPayment={(entryId) => {
                    // TODO: Implementovať edit payment screen
                    router.push(`/(tabs)/loans/${id}/pay?installmentId=${entryId}`);
                  }}
                  onCustomDatePayment={(entryId) => {
                    // TODO: Implementovať custom date picker
                    router.push(`/(tabs)/loans/${id}/pay?installmentId=${entryId}`);
                  }}
                  onRemovePayment={async (entryId) => {
                    try {
                      const entryToRemove = schedule.find((e) => e.id === entryId);
                      if (!entryToRemove) return;

                      // Optimistic update
                      setOptimisticSchedule((prev) =>
                        prev.map((e) =>
                          e.id === entryId
                            ? { ...e, status: 'pending' as const, paid_at: null }
                            : e
                        )
                      );

                      const {
                        data: { session },
                      } = await supabase.auth.getSession();

                      const response = await fetch(
                        `${process.env.EXPO_PUBLIC_API_URL}/api/loans/${id}/schedules/${entryId}/unpay`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session?.access_token}`,
                          },
                        }
                      );

                      if (!response.ok) {
                        throw new Error('Failed to remove payment');
                      }

                      // Reload data
                      await loadLoan();

                      setToast({
                        visible: true,
                        message: 'Platba bola odstránená',
                        type: 'success',
                      });
                    } catch (err) {
                      console.error('Error removing payment:', err);
                      // Revert optimistic update
                      setOptimisticSchedule(schedule);
                      setToast({
                        visible: true,
                        message: 'Nepodarilo sa odstrániť platbu',
                        type: 'error',
                      });
                    }
                  }}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              ))}

              {paidSchedule.length > 1 && !showPaidInstallments && (
                <TouchableOpacity
                  style={styles.showHistoryButton}
                  onPress={() => setShowPaidInstallments(true)}
                >
                  <Text style={styles.showHistoryText}>
                    Zobraziť históriu ({paidSchedule.length - 1} zaplatených)
                  </Text>
                </TouchableOpacity>
              )}

              {showPaidInstallments && paidSchedule.length > 0 && (
                <TouchableOpacity
                  style={styles.showHistoryButton}
                  onPress={() => setShowPaidInstallments(false)}
                >
                  <Text style={styles.showHistoryText}>Skryť históriu</Text>
                </TouchableOpacity>
              )}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button - smart color indicators */}
      {loan.status === 'active' && overdueCount > 0 && (
        <FloatingActionButton
          icon="⚠️"
          label={`${overdueCount} po splatnosti`}
          backgroundColor="#dc2626"
          onPress={handleMarkAllUntilToday}
        />
      )}
      
      {loan.status === 'active' && overdueCount === 0 && dueTodayCount > 0 && (
        <FloatingActionButton
          icon="📅"
          label={`${dueTodayCount} ${dueTodayCount === 1 ? 'dnes' : 'dnes'}`}
          backgroundColor="#f59e0b"
          onPress={handleMarkAllUntilToday}
        />
      )}

      {loan.status === 'active' && overdueCount === 0 && dueTodayCount === 0 && pendingUntilTodayCount > 0 && (
        <FloatingActionButton
          icon="✓"
          label={`${pendingUntilTodayCount}`}
          backgroundColor="#8b5cf6"
          onPress={handleMarkAllUntilToday}
        />
      )}

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 26,
    fontWeight: '600',
    color: '#374151',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 24,
  },
  overviewCard: {
    marginBottom: 16,
  },
  lender: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sublender: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressSection: {
    marginTop: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  remainingLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  remainingAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  contextHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  contextHintDanger: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  contextHintWarning: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  contextHintSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  contextHintIcon: {
    fontSize: 16,
  },
  contextHintText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  showHistoryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  showHistoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  bulkActionContainer: {
    marginBottom: 16,
  },
});

