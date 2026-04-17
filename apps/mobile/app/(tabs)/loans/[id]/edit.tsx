import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller, useWatch } from 'react-hook-form';
import * as Haptics from 'expo-haptics';
import { zodResolver } from '@/lib/form';
import { z } from 'zod';
import { LOAN_TYPE_OPTIONS, RATE_TYPE_OPTIONS, quickCalculateLoanData } from '@finapp/core';
import { FormDatePicker } from '@/components/forms/FormDatePicker';
import { FormNumericInput } from '@/components/forms/FormNumericInput';
import { SmartSlider } from '@/components/loans/SmartSlider';
import { LenderSelect } from '@/components/loans/LenderSelect';
import { LoanPreviewCard } from '@/components/loans/LoanPreviewCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getCurrentHousehold, type Loan } from '@/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/Toast';
import { useTheme } from '@/contexts';

const editLoanSchema = z.object({
  lender: z.string().min(1, 'Veriteľ je povinný'),
  loanType: z.enum([
    'annuity',
    'fixed_principal',
    'interest_only',
    'auto_loan',
    'graduated_payment',
  ]),
  principal: z.number().positive('Výška úveru musí byť väčšia ako 0'),
  annualRate: z.number().min(0).max(100),
  rateType: z.enum(['fixed', 'variable']),
  startDate: z.string().min(1, 'Dátum začiatku je povinný'),
  termMonths: z.number().int().positive('Doba splácania je povinná'),
  feeSetup: z.number().min(0).optional(),
  feeMonthly: z.number().min(0).optional(),
  insuranceMonthly: z.number().min(0).optional(),
  balloonAmount: z.number().min(0).optional(),
});

type FormData = z.infer<typeof editLoanSchema>;

const formatCurrency = (v: number) =>
  `${v.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const formatPercentage = (v: number) => `${v.toFixed(2)}%`;
const formatTermMonths = (v: number) => {
  const years = Math.floor(v / 12);
  const months = v % 12;
  if (years > 0 && months > 0) return `${years} r. ${months} m.`;
  if (years > 0) return `${years} ${years === 1 ? 'rok' : years < 5 ? 'roky' : 'rokov'}`;
  return `${months} mes.`;
};

export default function EditLoanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [householdId, setHouseholdId] = useState<string>('');
  const [loan, setLoan] = useState<Loan | null>(null);
  const [showLoanTypePicker, setShowLoanTypePicker] = useState(false);
  const [showRateTypePicker, setShowRateTypePicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasPayments, setHasPayments] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(editLoanSchema),
  });

  const watchedValues = useWatch({ control });
  const selectedLoanType = watchedValues?.loanType ?? 'annuity';
  const selectedRateType = watchedValues?.rateType ?? 'fixed';

  useEffect(() => {
    loadLoan();
  }, [id]);

  const loadLoan = async () => {
    try {
      setInitialLoading(true);

      const household = await getCurrentHousehold();
      setHouseholdId(household.id);

      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('id', id)
        .single();

      if (loanError) throw loanError;
      if (!loanData) throw new Error('Úver nebol nájdený');

      setLoan(loanData);

      const { data: installments } = await supabase
        .from('loan_schedules')
        .select('id, status')
        .eq('loan_id', id)
        .eq('status', 'paid')
        .limit(1);

      setHasPayments(Boolean(installments && installments.length > 0));

      reset({
        lender: loanData.lender,
        loanType: loanData.loan_type as FormData['loanType'],
        principal: Number(loanData.principal),
        annualRate: Number(loanData.annual_rate ?? loanData.rate ?? 0),
        rateType: (loanData.rate_type ?? 'fixed') as FormData['rateType'],
        startDate: loanData.start_date,
        termMonths: Number(loanData.term_months ?? loanData.term ?? 0),
        feeSetup: Number(loanData.fee_setup ?? 0),
        feeMonthly: Number(loanData.fee_monthly ?? 0),
        insuranceMonthly: Number(loanData.insurance_monthly ?? 0),
        balloonAmount: Number(loanData.balloon_amount ?? 0),
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nepodarilo sa načítať úver', 'error');
    } finally {
      setInitialLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  // Live preview
  const previewResult = useMemo(() => {
    const v = watchedValues;
    if (!v || !v.principal || !v.annualRate || !v.termMonths) return null;

    try {
      return quickCalculateLoanData({
        loanType: (v.loanType ?? 'annuity') as FormData['loanType'],
        principal: v.principal,
        annualRate: v.annualRate,
        termMonths: v.termMonths,
        startDate: new Date(v.startDate ?? new Date()),
        feeSetup: v.feeSetup ?? 0,
        feeMonthly: v.feeMonthly ?? 0,
        insuranceMonthly: v.insuranceMonthly ?? 0,
        calculationMode: 'rate_term',
      });
    } catch {
      return null;
    }
  }, [watchedValues]);

  const onSubmit = async (data: FormData) => {
    if (!householdId) {
      showToast('Chýba ID domácnosti', 'error');
      return;
    }

    if (hasPayments) {
      Alert.alert(
        'Upozornenie',
        'Tento úver má existujúce platby. Upravením parametrov úveru sa prepočíta splátkový kalendár. Zaplatené splátky zostanú.',
        [
          { text: 'Zrušiť', style: 'cancel' },
          {
            text: 'Pokračovať',
            onPress: () => submitForm(data),
          },
        ]
      );
      return;
    }

    await submitForm(data);
  };

  const submitForm = async (data: FormData) => {
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/loans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          lender: data.lender,
          loanType: data.loanType,
          principal: data.principal,
          annualRate: data.annualRate,
          rateType: data.rateType,
          startDate: new Date(data.startDate).toISOString(),
          termMonths: data.termMonths,
          feeSetup: data.feeSetup ?? 0,
          feeMonthly: data.feeMonthly ?? 0,
          insuranceMonthly: data.insuranceMonthly ?? 0,
          balloonAmount: data.balloonAmount ?? null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Nepodarilo sa upraviť úver');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Úver bol úspešne upravený', 'success');
      setTimeout(() => {
        router.replace(`/(tabs)/loans/${id}`);
      }, 1200);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showToast(error instanceof Error ? error.message : 'Nepodarilo sa upraviť úver', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getLoanTypeLabel = (value: string): string => {
    return LOAN_TYPE_OPTIONS.find((t) => t.value === value)?.label || value;
  };

  const getRateTypeLabel = (value: string): string => {
    return RATE_TYPE_OPTIONS.find((t) => t.value === value)?.label || value;
  };

  if (initialLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Načítavam…</Text>
        </View>
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.danger }]}>Úver nebol nájdený</Text>
          <Button onPress={() => router.replace('/(tabs)/loans')} variant="outline">
            Späť na úvery
          </Button>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>Upraviť úver</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Upravte údaje úveru
          </Text>

          {hasPayments && (
            <View
              style={[
                styles.warningBox,
                {
                  backgroundColor: colors.warningLight ?? '#fef3c7',
                  borderLeftColor: colors.warning,
                },
              ]}
            >
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Tento úver má existujúce platby. Úpravou parametrov sa prepočíta splátkový kalendár.
                Zaplatené splátky zostanú zachované.
              </Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Základné info */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Základné info</Text>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Veriteľ *</Text>
              <Controller
                control={control}
                name="lender"
                render={({ field: { onChange, value } }) => (
                  <LenderSelect value={value} onChange={onChange} error={errors.lender?.message} />
                )}
              />
            </View>

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Typ úveru *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  {
                    borderColor: errors.loanType ? colors.danger : colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                onPress={() => setShowLoanTypePicker(true)}
                accessibilityRole="button"
                accessibilityLabel={`Typ úveru: ${getLoanTypeLabel(selectedLoanType)}`}
              >
                <Text style={[styles.pickerButtonText, { color: colors.text }]}>
                  {getLoanTypeLabel(selectedLoanType)}
                </Text>
                <Text style={[styles.chevron, { color: colors.textMuted }]}>▼</Text>
              </TouchableOpacity>
              {errors.loanType && (
                <Text style={[styles.fieldErrorText, { color: colors.danger }]}>
                  {errors.loanType.message}
                </Text>
              )}
            </View>

            <FormDatePicker
              control={control}
              name="startDate"
              label="Začiatok úveru *"
              locale="sk-SK"
            />

            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Typ sadzby *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                onPress={() => setShowRateTypePicker(true)}
              >
                <Text style={[styles.pickerButtonText, { color: colors.text }]}>
                  {getRateTypeLabel(selectedRateType)}
                </Text>
                <Text style={[styles.chevron, { color: colors.textMuted }]}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Parametre */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }]}>
              Parametre úveru
            </Text>

            <Controller
              control={control}
              name="principal"
              render={({ field: { onChange, value } }) => (
                <SmartSlider
                  label="Výška úveru *"
                  value={value ?? 0}
                  onValueChange={onChange}
                  minimumValue={100}
                  maximumValue={500000}
                  step={100}
                  currency="€"
                  formatDisplay={formatCurrency}
                  disabled={saving}
                  presets={[
                    { label: '5k', value: 5000 },
                    { label: '10k', value: 10000 },
                    { label: '25k', value: 25000 },
                    { label: '50k', value: 50000 },
                    { label: '100k', value: 100000 },
                  ]}
                />
              )}
            />

            <Controller
              control={control}
              name="annualRate"
              render={({ field: { onChange, value } }) => (
                <SmartSlider
                  label="Úroková sadzba *"
                  value={value ?? 0}
                  onValueChange={onChange}
                  minimumValue={0}
                  maximumValue={25}
                  step={0.1}
                  suffix=" %"
                  formatDisplay={formatPercentage}
                  disabled={saving}
                  presets={[
                    { label: '3%', value: 3 },
                    { label: '5%', value: 5 },
                    { label: '7%', value: 7 },
                    { label: '9%', value: 9 },
                  ]}
                />
              )}
            />

            <Controller
              control={control}
              name="termMonths"
              render={({ field: { onChange, value } }) => (
                <SmartSlider
                  label="Doba splácania *"
                  value={value ?? 0}
                  onValueChange={(v) => onChange(Math.round(v))}
                  minimumValue={6}
                  maximumValue={360}
                  step={1}
                  suffix=" mes."
                  formatDisplay={formatTermMonths}
                  disabled={saving}
                  presets={[
                    { label: '1 r', value: 12 },
                    { label: '3 r', value: 36 },
                    { label: '5 r', value: 60 },
                    { label: '10 r', value: 120 },
                    { label: '20 r', value: 240 },
                    { label: '30 r', value: 360 },
                  ]}
                />
              )}
            />

            {/* Live preview */}
            <LoanPreviewCard result={previewResult} principal={watchedValues?.principal ?? 0} />

            {/* Advanced fees */}
            <TouchableOpacity
              onPress={() => setShowAdvanced((s) => !s)}
              style={[styles.advancedToggle, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={
                showAdvanced ? 'Skryť rozšírené poplatky' : 'Zobraziť rozšírené poplatky'
              }
            >
              <Text style={[styles.advancedToggleText, { color: colors.primary }]}>
                {showAdvanced ? '▼ Skryť poplatky a poistenie' : '▶ Zobraziť poplatky a poistenie'}
              </Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View style={styles.advancedContent}>
                <FormNumericInput
                  control={control}
                  name="feeSetup"
                  label="Poplatok za zriadenie"
                  currency="€"
                  min={0}
                  max={50000}
                  emptyIsZero
                />
                <FormNumericInput
                  control={control}
                  name="feeMonthly"
                  label="Mesačný poplatok"
                  currency="€"
                  min={0}
                  max={500}
                  emptyIsZero
                />
                <FormNumericInput
                  control={control}
                  name="insuranceMonthly"
                  label="Mesačné poistenie"
                  currency="€"
                  min={0}
                  max={1000}
                  emptyIsZero
                />
                {watchedValues?.loanType === 'interest_only' && (
                  <FormNumericInput
                    control={control}
                    name="balloonAmount"
                    label="Balónová splátka (na konci)"
                    currency="€"
                    min={0}
                    max={watchedValues?.principal}
                    emptyIsZero
                  />
                )}
              </View>
            )}

            <View style={styles.buttons}>
              <Button onPress={handleSubmit(onSubmit)} loading={saving} disabled={saving} fullWidth>
                Uložiť zmeny
              </Button>
              <Button
                onPress={() => router.replace(`/(tabs)/loans/${id}`)}
                variant="outline"
                disabled={saving}
                fullWidth
                style={{ marginTop: 12 }}
              >
                Zrušiť
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showLoanTypePicker}
        onClose={() => setShowLoanTypePicker(false)}
        title="Vyberte typ úveru"
      >
        <View style={styles.pickerList}>
          {LOAN_TYPE_OPTIONS.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.pickerItem,
                selectedLoanType === type.value && {
                  backgroundColor: colors.primaryLight ?? '#f5f3ff',
                },
              ]}
              onPress={() => {
                setValue('loanType', type.value, { shouldDirty: true });
                setShowLoanTypePicker(false);
              }}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  { color: colors.text },
                  selectedLoanType === type.value && {
                    color: colors.primary,
                    fontWeight: '600',
                  },
                ]}
              >
                {type.label}
              </Text>
              {selectedLoanType === type.value && (
                <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      <Modal
        visible={showRateTypePicker}
        onClose={() => setShowRateTypePicker(false)}
        title="Vyberte typ sadzby"
      >
        <View style={styles.pickerList}>
          {RATE_TYPE_OPTIONS.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.pickerItem,
                selectedRateType === type.value && {
                  backgroundColor: colors.primaryLight ?? '#f5f3ff',
                },
              ]}
              onPress={() => {
                setValue('rateType', type.value, { shouldDirty: true });
                setShowRateTypePicker(false);
              }}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  { color: colors.text },
                  selectedRateType === type.value && {
                    color: colors.primary,
                    fontWeight: '600',
                  },
                ]}
              >
                {type.label}
              </Text>
              {selectedRateType === type.value && (
                <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

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
    textAlign: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  pickerButtonText: {
    fontSize: 16,
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    marginLeft: 8,
  },
  fieldErrorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  advancedToggle: {
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  advancedContent: {
    marginTop: 8,
    gap: 4,
  },
  buttons: {
    marginTop: 24,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemText: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
  },
});
