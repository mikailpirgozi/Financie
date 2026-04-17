import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/form';
import { z } from 'zod';

import {
  Loan,
  previewEarlyRepayment,
  processEarlyRepayment,
  getLoan,
  EarlyRepaymentPreview,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NumericInput } from '@/components/forms/NumericInput';
import { DatePicker } from '@/components/ui/DatePicker';

const earlyRepaymentSchema = z.object({
  amount: z.number({ error: 'Zadajte sumu' }).positive('Suma musí byť väčšia ako 0'),
  payment_date: z.date({ error: 'Vyberte dátum' }),
});

type EarlyRepaymentFormData = z.infer<typeof earlyRepaymentSchema>;

export default function EarlyRepaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [preview, setPreview] = useState<EarlyRepaymentPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    watch,
    setValue,
    formState: { errors },
  } = useForm<EarlyRepaymentFormData>({
    resolver: zodResolver(earlyRepaymentSchema),
    defaultValues: {
      amount: 0,
      payment_date: new Date(),
    },
  });

  useEffect(() => {
    loadLoan();
  }, [id]);

  const loadLoan = async () => {
    if (!id) return;
    try {
      const { loan: loanData } = await getLoan(id);
      setLoan(loanData);
    } catch (err) {
      setError('Nepodarilo sa načítať údaje o úvere');
      console.error('Failed to load loan:', err);
    }
  };

  const handlePreview = async () => {
    if (!loan || !id) return;
    const amount = watch('amount');
    const payment_date = watch('payment_date');

    if (!amount || !Number.isFinite(amount) || amount <= 0) {
      setError('Zadajte platnú sumu');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const previewData = await previewEarlyRepayment(id, {
        amount,
        payment_date: payment_date.toISOString(),
        preview: true,
      });

      setPreview(previewData);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nepodarilo sa vypočítať náhľad';
      setError(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!preview || !id) return;
    const amount = watch('amount');

    Alert.alert(
      'Potvrdiť predčasné splatenie',
      `Naozaj chcete splatiť ${formatCurrency(amount)}?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Potvrdiť',
          onPress: processRepayment,
        },
      ]
    );
  };

  const processRepayment = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const amount = watch('amount');
      const payment_date = watch('payment_date');

      await processEarlyRepayment(id, {
        amount,
        payment_date: payment_date.toISOString(),
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate to loan detail explicitly instead of router.back()
      router.replace(`/(tabs)/loans/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nepodarilo sa zaznamenať platbu';
      setError(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Predčasné splatenie</Text>
        <Text style={styles.subtitle}>{loan?.lender}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        <View style={styles.form}>
          <Card style={styles.loanInfo}>
            <Text style={styles.infoLabel}>Zostávajúca istina:</Text>
            <Text style={styles.infoValue}>
              {loan ? formatCurrency(loan.remaining_balance) : '—'}
            </Text>
          </Card>

          <NumericInput
            label="Suma na splatenie"
            value={watch('amount')}
            onChangeValue={(val) => setValue('amount', val ?? 0, { shouldValidate: true })}
            currency="€"
            min={0}
            max={loan?.remaining_balance != null ? Number(loan.remaining_balance) : undefined}
            error={errors.amount?.message}
          />

          <DatePicker
            label="Dátum platby"
            value={watch('payment_date')}
            onChange={(date) => setValue('payment_date', date)}
            error={errors.payment_date?.message}
          />

          <Button
            onPress={handlePreview}
            variant="outline"
            loading={loading}
            disabled={loading}
            fullWidth
            style={styles.previewButton}
          >
            Zobraziť náhľad
          </Button>

          {preview && (
            <Card style={styles.previewCard}>
              <Text style={styles.previewTitle}>📊 Náhľad dopadu</Text>

              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Nová zostávajúca istina:</Text>
                <Text style={styles.previewValue}>
                  {formatCurrency(preview.new_remaining_principal)}
                </Text>
              </View>

              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Ušetrený úrok:</Text>
                <Text style={[styles.previewValue, styles.positive]}>
                  +{formatCurrency(preview.saved_interest)}
                </Text>
              </View>

              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Nový počet splátok:</Text>
                <Text style={styles.previewValue}>{preview.new_installment_count}</Text>
              </View>
            </Card>
          )}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          onPress={handleConfirm}
          loading={loading}
          disabled={loading || !preview}
          fullWidth
          style={styles.button}
        >
          Potvrdiť splatenie
        </Button>
        <Button
          onPress={() => router.replace(`/(tabs)/loans/${id}`)}
          variant="outline"
          fullWidth
          style={styles.button}
        >
          Zrušiť
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fee',
    borderColor: '#f55',
    borderWidth: 1,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  form: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  loanInfo: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  previewButton: {
    marginTop: 8,
  },
  previewCard: {
    marginTop: 16,
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#0ea5e9',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  previewLabel: {
    fontSize: 13,
    color: '#666',
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  positive: {
    color: '#10b981',
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 8,
  },
  button: {
    marginBottom: 4,
  },
});
