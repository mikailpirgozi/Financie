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
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calendar, CreditCard, StickyNote, AlertTriangle, Info } from 'lucide-react-native';
import { FormDatePicker } from '@/components/forms/FormDatePicker';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { FormInput } from '@/components/forms/FormInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SegmentControl, SegmentOption } from '@/components/ui/SegmentControl';
import { type Loan } from '@/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/Toast';
import { useTheme } from '../../../../src/contexts';
import { usePayLoan } from '../../../../src/hooks';
import * as Haptics from 'expo-haptics';

const payLoanSchema = z.object({
  amount: z.number().positive('Suma musi byt vacsia ako 0'),
  date: z.string(),
  note: z.string().optional(),
  notePriority: z.enum(['high', 'normal', 'low']),
  noteType: z.enum(['pending', 'info']),
});

type FormData = z.infer<typeof payLoanSchema>;

type NotePriority = 'high' | 'normal' | 'low';
type NoteType = 'pending' | 'info';

const priorityOptions: SegmentOption<NotePriority>[] = [
  { value: 'high', label: 'Vysoka' },
  { value: 'normal', label: 'Normalna' },
  { value: 'low', label: 'Nizka' },
];

const typeOptions: SegmentOption<NoteType>[] = [
  { value: 'info', label: 'Info' },
  { value: 'pending', label: 'Treba vybavit' },
];

export default function PayLoanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const colors = theme.colors;

  // React Query mutation for payment
  const payLoanMutation = usePayLoan();

  const [loading, setLoading] = useState(true);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [nextInstallmentAmount, setNextInstallmentAmount] = useState<number>(0);
  const [nextInstallmentId, setNextInstallmentId] = useState<string | null>(null);
  const [nextDueDate, setNextDueDate] = useState<string | null>(null);
  const [showNoteOptions, setShowNoteOptions] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Derive paying state from mutation
  const paying = payLoanMutation.isPending;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(payLoanSchema),
    defaultValues: {
      amount: 0,
      date: new Date().toISOString(),
      note: '',
      notePriority: 'normal',
      noteType: 'info',
    },
  });

  const watchedAmount = watch('amount');
  const watchedNote = watch('note');

  // Show note options when note has content
  useEffect(() => {
    if (watchedNote && watchedNote.trim().length > 0) {
      setShowNoteOptions(true);
    }
  }, [watchedNote]);

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
      if (!loanData) throw new Error('Uver nebol najdeny');

      setLoan(loanData);

      // Find next unpaid installment from loan_schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from('loan_schedules')
        .select('*')
        .eq('loan_id', id)
        .neq('status', 'paid')
        .order('installment_no', { ascending: true })
        .limit(1);

      if (!schedulesError && schedules && schedules.length > 0) {
        const schedule = schedules[0];
        console.log('Found next installment:', schedule.id, schedule.installment_no);
        setNextInstallmentId(schedule.id);
        setNextInstallmentAmount(parseFloat(schedule.total_due));
        setNextDueDate(schedule.due_date);
        setValue('amount', parseFloat(schedule.total_due));
      } else {
        // Fallback to monthly payment
        console.log('No unpaid installments found for loan:', id);
        setNextInstallmentId(null);
        setValue('amount', parseFloat(loanData.monthly_payment));
        setNextInstallmentAmount(parseFloat(loanData.monthly_payment));
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa nacitat uver',
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const onSubmit = async (data: FormData) => {
    if (!loan) {
      showToast('Chybaju udaje o uvere', 'error');
      return;
    }

    if (!nextInstallmentId) {
      showToast('Ziadna splatka na uhradenie', 'error');
      return;
    }

    // Use mutation hook for payment - this automatically invalidates cache
    payLoanMutation.mutate(
      {
        loanId: id!,
        installmentId: nextInstallmentId,
        amount: data.amount,
        date: data.date,
      },
      {
        onSuccess: async () => {
          // If there's a note, create it as a loan note
          if (data.note && data.note.trim()) {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              await fetch(`${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/notes`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                  content: data.note.trim(),
                  priority: data.notePriority,
                  status: data.noteType,
                  is_pinned: data.notePriority === 'high',
                }),
              });
            } catch (noteErr) {
              console.warn('Failed to create note:', noteErr);
              // Don't fail the payment if note creation fails
            }
          }

          showToast('Splatka bola uspesne zaplatena', 'success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Navigate back - cache is already invalidated by the mutation
          setTimeout(() => {
            router.back();
          }, 1000);
        },
        onError: (error) => {
          showToast(
            error instanceof Error ? error.message : 'Nepodarilo sa zaplatit splatku',
            'error'
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Nacitavam...
          </Text>
        </View>
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <AlertTriangle size={48} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>
            Uver nebol najdeny
          </Text>
          <Button onPress={() => router.back()} variant="outline">
            Spat
          </Button>
        </View>
      </View>
    );
  }

  if (!nextInstallmentId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Info size={48} color={colors.info} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Ziadna splatka na uhradenie
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
            Vsetky splatky su uz uhradene
          </Text>
          <Button onPress={() => router.back()} variant="outline">
            Spat
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <CreditCard size={32} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>
              Zaplatit splatku
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {loan.name || loan.lender}
            </Text>
          </View>

          {/* Loan Info Card */}
          <Card
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Zostava splatit
              </Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                {formatCurrency(parseFloat(String(loan.remaining_balance)))}
              </Text>
            </View>
            <View
              style={[styles.infoDivider, { backgroundColor: colors.borderLight }]}
            />
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Mesacna splatka
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {formatCurrency(parseFloat(String(loan.monthly_payment)))}
              </Text>
            </View>
            {nextDueDate && (
              <>
                <View
                  style={[
                    styles.infoDivider,
                    { backgroundColor: colors.borderLight },
                  ]}
                />
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                    Dalsia splatnost
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(nextDueDate)}
                  </Text>
                </View>
              </>
            )}
          </Card>

          {/* Form */}
          <View style={styles.form}>
            {/* Date Picker Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Calendar size={18} color={colors.primary} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  Datum platby
                </Text>
              </View>
              <FormDatePicker
                control={control}
                name="date"
                label=""
                locale="sk-SK"
              />
              <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                Predvoleny je dnesny datum
              </Text>
            </View>

            {/* Amount Section */}
            <View style={styles.formSection}>
              <CurrencyInput control={control} name="amount" label="Suma (€) *" />

              {watchedAmount !== nextInstallmentAmount &&
                nextInstallmentAmount > 0 && (
                  <View
                    style={[
                      styles.suggestedAmount,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Text
                      style={[styles.suggestedText, { color: colors.primary }]}
                    >
                      Odporucana suma: {formatCurrency(nextInstallmentAmount)}
                    </Text>
                    <Button
                      onPress={() => setValue('amount', nextInstallmentAmount)}
                      variant="outline"
                      size="sm"
                    >
                      Pouzit
                    </Button>
                  </View>
                )}
            </View>

            {/* Note Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <StickyNote size={18} color={colors.primary} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  Poznamka k platbe
                </Text>
              </View>

              <FormInput
                control={control}
                name="note"
                label=""
                placeholder="Napr. Zaplatene cez internetbanking..."
                multiline
                numberOfLines={3}
                style={{ minHeight: 80 }}
              />

              {/* Note Options - shown when note has content */}
              {showNoteOptions && (
                <View style={styles.noteOptions}>
                  {/* Priority */}
                  <View style={styles.noteOption}>
                    <Text
                      style={[styles.noteOptionLabel, { color: colors.textSecondary }]}
                    >
                      Priorita poznamky
                    </Text>
                    <Controller
                      control={control}
                      name="notePriority"
                      render={({ field: { value, onChange } }) => (
                        <SegmentControl
                          options={priorityOptions}
                          value={value}
                          onChange={onChange}
                          size="sm"
                        />
                      )}
                    />
                  </View>

                  {/* Type */}
                  <View style={styles.noteOption}>
                    <Text
                      style={[styles.noteOptionLabel, { color: colors.textSecondary }]}
                    >
                      Typ poznamky
                    </Text>
                    <Controller
                      control={control}
                      name="noteType"
                      render={({ field: { value, onChange } }) => (
                        <SegmentControl
                          options={typeOptions}
                          value={value}
                          onChange={onChange}
                          size="sm"
                        />
                      )}
                    />
                    <View style={styles.typeHint}>
                      {watch('noteType') === 'pending' ? (
                        <>
                          <AlertTriangle size={14} color={colors.warning} />
                          <Text
                            style={[styles.typeHintText, { color: colors.textMuted }]}
                          >
                            Mozete neskor oznacit ako vybavene
                          </Text>
                        </>
                      ) : (
                        <>
                          <Info size={14} color={colors.info} />
                          <Text
                            style={[styles.typeHintText, { color: colors.textMuted }]}
                          >
                            Len informativna poznamka
                          </Text>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttons}>
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={paying}
                disabled={paying}
                fullWidth
              >
                Potvrdit platbu
              </Button>
              <Button
                onPress={() => router.back()}
                variant="outline"
                disabled={paying}
                fullWidth
                style={{ marginTop: 12 }}
              >
                Zrusit
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  infoCard: {
    marginBottom: 24,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoDivider: {
    height: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: '700',
  },
  form: {
    gap: 20,
  },
  formSection: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 12,
    marginTop: 4,
  },
  suggestedAmount: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  suggestedText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  noteOptions: {
    marginTop: 12,
    gap: 16,
  },
  noteOption: {
    gap: 8,
  },
  noteOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  typeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  typeHintText: {
    fontSize: 12,
  },
  buttons: {
    marginTop: 32,
  },
});
