import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getLoan, type Loan } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

interface LoanInstallment {
  id: string;
  loan_id: string;
  sequence_number: number;
  due_date: string;
  principal: number;
  interest: number;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
}

export default function LoanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [installments, setInstallments] = useState<LoanInstallment[]>([]);
  const [showAllInstallments, setShowAllInstallments] = useState(false);
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

      // Fetch installments from Supabase
      const { data: installmentsData, error: installmentsError } = await supabase
        .from('loan_installments')
        .select('*')
        .eq('loan_id', id)
        .order('sequence_number', { ascending: true });

      if (installmentsError) {
        console.warn('⚠️ Failed to load installments:', installmentsError);
      }
      setInstallments(installmentsData || []);
    } catch (err) {
      console.error('❌ Failed to load loan:', err);
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať úver');
    } finally {
      setLoading(false);
    }
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

  const formatMonthYear = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      month: 'short',
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

  const getInstallmentStatusBadge = (status: string): React.JSX.Element => {
    if (status === 'paid') {
      return <Badge variant="success">Zaplatené</Badge>;
    }
    if (status === 'overdue') {
      return <Badge variant="warning">Po splatnosti</Badge>;
    }
    return <Badge variant="default">Nezaplatené</Badge>;
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
  const displayedInstallments = showAllInstallments
    ? installments
    : installments.slice(0, 6);
  const paidInstallments = installments.filter((i) => i.status === 'paid').length;
  const totalInstallments = installments.length;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Overview Card */}
          <Card style={styles.overviewCard}>
            <Text style={styles.lender}>{loan.lender}</Text>
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
          {installments.length > 0 && (
            <Card>
              <View style={styles.scheduleHeader}>
                <Text style={styles.sectionTitle}>Splátkový kalendár</Text>
                <Text style={styles.scheduleProgress}>
                  {paidInstallments} / {totalInstallments}
                </Text>
              </View>

              {displayedInstallments.map((installment) => (
                <View key={installment.id} style={styles.installmentRow}>
                  <View style={styles.installmentLeft}>
                    <Text style={styles.installmentNumber}>#{installment.sequence_number}</Text>
                    <View>
                      <Text style={styles.installmentDate}>
                        {formatMonthYear(installment.due_date)}
                      </Text>
                      <Text style={styles.installmentAmount}>
                        {formatCurrency(installment.total_amount)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.installmentRight}>
                    {getInstallmentStatusBadge(installment.status)}
                  </View>
                </View>
              ))}

              {installments.length > 6 && !showAllInstallments && (
                <Button
                  onPress={() => setShowAllInstallments(true)}
                  variant="outline"
                  style={styles.showMoreButton}
                >
                  {`Zobraziť všetky (${installments.length})`}
                </Button>
              )}

              {showAllInstallments && (
                <Button
                  onPress={() => setShowAllInstallments(false)}
                  variant="outline"
                  style={styles.showMoreButton}
                >
                  Zobraziť menej
                </Button>
              )}
            </Card>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      {loan.status === 'active' && (
        <View style={styles.actions}>
          <Button
            onPress={() => router.push(`/(tabs)/loans/${id}/pay`)}
            variant="primary"
            fullWidth
          >
            Zaplatiť splátku
          </Button>
          <View style={styles.actionRow}>
            <Button
              onPress={() => router.push(`/(tabs)/loans/${id}/early-repayment`)}
              variant="outline"
              style={{ flex: 1, marginRight: 4 }}
            >
              Predčasne splatiť
            </Button>
            <Button
              onPress={() => router.push(`/(tabs)/loans/${id}/simulate`)}
              variant="outline"
              style={{ flex: 1, marginHorizontal: 4 }}
            >
              Simulovať
            </Button>
          </View>
          <View style={styles.actionRow}>
            <Button
              onPress={() => router.push(`/(tabs)/loans/${id}/edit`)}
              variant="outline"
              style={{ flex: 1, marginRight: 4 }}
            >
              Upraviť
            </Button>
            <Button
              onPress={handleDelete}
              variant="destructive"
              style={{ flex: 1 }}
            >
              Zmazať
            </Button>
          </View>
        </View>
      )}

      {loan.status === 'paid_off' && (
        <View style={styles.actions}>
          <Button
            onPress={handleDelete}
            variant="destructive"
            fullWidth
          >
            Zmazať úver
          </Button>
        </View>
      )}

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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 180,
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
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  installmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  installmentNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8b5cf6',
    width: 32,
  },
  installmentDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  installmentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  installmentRight: {
    marginLeft: 12,
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
});

