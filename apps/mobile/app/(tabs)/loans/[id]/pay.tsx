import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormDatePicker } from '@/components/forms/FormDatePicker';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { FormInput } from '@/components/forms/FormInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { type Loan } from '@/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

const payLoanSchema = z.object({
  amount: z.number().positive('Suma musí byť väčšia ako 0'),
  date: z.string(),
  note: z.string().optional(),
});

type FormData = z.infer<typeof payLoanSchema>;

export default function PayLoanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [nextInstallmentAmount, setNextInstallmentAmount] = useState<number>(0);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const {
    control,
    handleSubmit,
    formState: {},
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(payLoanSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString(),
      note: '',
    },
  });

  const watchedAmount = watch('amount');

  useEffect(() => {
    loadLoan();
  }, [id]);

  const loadLoan = async () => {
    try {
      setLoading(true);

      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', id)
        .single();

      if (loanError) throw loanError;
      if (!loanData) throw new Error('Úver nebol nájdený');

      setLoan(loanData);

      // Find next unpaid installment
      const { data: installments, error: installmentsError } = await supabase
        .from('loan_installments')
        .select('*')
        .eq('loan_id', id)
        .eq('status', 'pending')
        .order('sequence_number', { ascending: true })
        .limit(1);

      if (!installmentsError && installments && installments.length > 0) {
        setNextInstallmentAmount(installments[0].total_amount);
        setValue('amount', installments[0].total_amount);
      } else {
        // Fallback to monthly payment
        setValue('amount', loanData.monthly_payment);
        setNextInstallmentAmount(loanData.monthly_payment);
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa načítať úver',
        'error'
      );
    } finally {
      setLoading(false);
    }
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

  const onSubmit = async (data: FormData) => {
    if (!loan) {
      showToast('Chýbajú údaje o úvere', 'error');
      return;
    }

    setPaying(true);
    try {
      // Call the pay API endpoint
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          amount: data.amount,
          paymentDate: data.date,
          note: data.note || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodarilo sa zaplatiť splátku');
      }

      showToast('Splátka bola úspešne zaplatená', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa zaplatiť splátku',
        'error'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setPaying(false);
    }
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

  if (!loan) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Úver nebol nájdený</Text>
          <Button onPress={() => router.back()} variant="outline">
            Späť
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Zaplatiť splátku</Text>
          <Text style={styles.subtitle}>{loan.lender}</Text>

          {/* Loan Info Card */}
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Zostáva splatit</Text>
              <Text style={styles.infoValue}>{formatCurrency(loan.remaining_balance)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mesačná splátka</Text>
              <Text style={styles.infoValue}>{formatCurrency(loan.monthly_payment)}</Text>
            </View>
          </Card>

          <View style={styles.form}>
            <FormDatePicker
              control={control}
              name="date"
              label="Dátum platby *"
              locale="sk-SK"
            />

            <CurrencyInput
              control={control}
              name="amount"
              label="Suma (€) *"
            />

            {watchedAmount !== nextInstallmentAmount && nextInstallmentAmount > 0 && (
              <View style={styles.suggestedAmount}>
                <Text style={styles.suggestedText}>
                  Odporúčaná suma: {formatCurrency(nextInstallmentAmount)}
                </Text>
                <Button
                  onPress={() => setValue('amount', nextInstallmentAmount)}
                  variant="outline"
                  size="sm"
                >
                  Použiť
                </Button>
              </View>
            )}

            <FormInput
              control={control}
              name="note"
              label="Poznámka"
              placeholder="Voliteľná poznámka"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80 }}
            />

            <View style={styles.buttons}>
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={paying}
                disabled={paying}
                fullWidth
              >
                Potvrdiť platbu
              </Button>
              <Button
                onPress={() => router.back()}
                variant="outline"
                disabled={paying}
                fullWidth
                style={{ marginTop: 12 }}
              >
                Zrušiť
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
    </KeyboardAvoidingView>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  form: {
    gap: 4,
  },
  suggestedAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ede9fe',
    borderRadius: 8,
    marginBottom: 16,
  },
  suggestedText: {
    fontSize: 14,
    color: '#6d28d9',
    fontWeight: '500',
  },
  buttons: {
    marginTop: 24,
  },
});

