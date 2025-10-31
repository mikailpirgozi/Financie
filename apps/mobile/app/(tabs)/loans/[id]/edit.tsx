import React, { useState, useEffect } from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLoanSchema } from '@finapp/core';
import { FormInput } from '@/components/forms/FormInput';
import { FormDatePicker } from '@/components/forms/FormDatePicker';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getCurrentHousehold, type Loan } from '@/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/Toast';

const LOAN_TYPES = [
  { value: 'annuity', label: 'Anuitný' },
  { value: 'fixed_principal', label: 'Fixný istina' },
  { value: 'interest_only', label: 'Iba úrok' },
  { value: 'auto_loan', label: 'Auto úver' },
] as const;

const RATE_TYPES = [
  { value: 'fixed', label: 'Fixná' },
  { value: 'variable', label: 'Variabilná' },
] as const;

type FormData = {
  lender: string;
  loanType: 'annuity' | 'fixed_principal' | 'interest_only' | 'auto_loan';
  principal: number;
  annualRate: number;
  rateType: 'fixed' | 'variable';
  startDate: string;
  termMonths: number;
  feeSetup?: number;
  feeMonthly?: number;
};

export default function EditLoanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [householdId, setHouseholdId] = useState<string>('');
  const [loan, setLoan] = useState<Loan | null>(null);
  const [showLoanTypePicker, setShowLoanTypePicker] = useState(false);
  const [showRateTypePicker, setShowRateTypePicker] = useState(false);
  const [hasPayments, setHasPayments] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(
      createLoanSchema.omit({ householdId: true, dayCountConvention: true })
    ),
  });

  const selectedLoanType = watch('loanType');
  const selectedRateType = watch('rateType');

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

      // Check if loan has any payments
      const { data: installments } = await supabase
        .from('loan_installments')
        .select('id, status')
        .eq('loan_id', id)
        .eq('status', 'paid')
        .limit(1);

      setHasPayments(Boolean(installments && installments.length > 0));

      // Populate form
      reset({
        lender: loanData.lender,
        loanType: loanData.loan_type as any,
        principal: loanData.principal,
        annualRate: loanData.rate,
        rateType: loanData.rate_type as any,
        startDate: loanData.start_date,
        termMonths: loanData.term,
        feeSetup: loanData.fee_setup || 0,
        feeMonthly: loanData.fee_monthly || 0,
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa načítať úver',
        'error'
      );
    } finally {
      setInitialLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const onSubmit = async (data: FormData) => {
    if (!householdId) {
      showToast('Chýba ID domácnosti', 'error');
      return;
    }

    if (hasPayments) {
      Alert.alert(
        'Upozornenie',
        'Tento úver má existujúce platby. Upravením parametrov úveru sa prepočíta splátkový kalendár.',
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
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/loans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          lender: data.lender,
          loanType: data.loanType,
          principal: data.principal,
          annualRate: data.annualRate,
          rateType: data.rateType,
          startDate: new Date(data.startDate).toISOString(),
          termMonths: data.termMonths,
          feeSetup: data.feeSetup || 0,
          feeMonthly: data.feeMonthly || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodarilo sa upraviť úver');
      }

      showToast('Úver bol úspešne upravený', 'success');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa upraviť úver',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const getLoanTypeLabel = (value: string): string => {
    return LOAN_TYPES.find((t) => t.value === value)?.label || value;
  };

  const getRateTypeLabel = (value: string): string => {
    return RATE_TYPES.find((t) => t.value === value)?.label || value;
  };

  if (initialLoading) {
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
          <Text style={styles.title}>Upraviť úver</Text>
          <Text style={styles.subtitle}>Upravte údaje úveru</Text>

          {hasPayments && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                Tento úver má existujúce platby. Úpravou parametrov sa prepočíta splátkový kalendár.
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <FormInput
              control={control}
              name="lender"
              label="Veriteľ *"
              placeholder="Napr. Banka XYZ"
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Typ úveru *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  errors.loanType && styles.pickerButtonError,
                ]}
                onPress={() => setShowLoanTypePicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  {getLoanTypeLabel(selectedLoanType)}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
              {errors.loanType && (
                <Text style={styles.fieldErrorText}>{errors.loanType.message}</Text>
              )}
            </View>

            <CurrencyInput
              control={control}
              name="principal"
              label="Výška úveru (€) *"
            />

            <FormInput
              control={control}
              name="annualRate"
              label="Úroková sadzba (% p.a.) *"
              placeholder="Napr. 5.5"
              keyboardType="decimal-pad"
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Typ sadzby *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  errors.rateType && styles.pickerButtonError,
                ]}
                onPress={() => setShowRateTypePicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  {getRateTypeLabel(selectedRateType)}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
              {errors.rateType && (
                <Text style={styles.fieldErrorText}>{errors.rateType.message}</Text>
              )}
            </View>

            <FormDatePicker
              control={control}
              name="startDate"
              label="Začiatok úveru *"
              locale="sk-SK"
            />

            <FormInput
              control={control}
              name="termMonths"
              label="Obdobie (mesiace) *"
              placeholder="Napr. 60"
              keyboardType="number-pad"
            />

            <Text style={styles.sectionTitle}>Voliteľné poplatky</Text>

            <CurrencyInput
              control={control}
              name="feeSetup"
              label="Administratívny poplatok (€)"
            />

            <CurrencyInput
              control={control}
              name="feeMonthly"
              label="Mesačný poplatok (€)"
            />

            <View style={styles.buttons}>
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={saving}
                disabled={saving}
                fullWidth
              >
                Uložiť zmeny
              </Button>
              <Button
                onPress={() => router.back()}
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

      {/* Loan Type Picker Modal */}
      <Modal
        visible={showLoanTypePicker}
        onClose={() => setShowLoanTypePicker(false)}
        title="Vyberte typ úveru"
      >
        <View style={styles.pickerList}>
          {LOAN_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.pickerItem,
                selectedLoanType === type.value && styles.pickerItemSelected,
              ]}
              onPress={() => {
                setValue('loanType', type.value);
                setShowLoanTypePicker(false);
              }}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  selectedLoanType === type.value && styles.pickerItemTextSelected,
                ]}
              >
                {type.label}
              </Text>
              {selectedLoanType === type.value && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Rate Type Picker Modal */}
      <Modal
        visible={showRateTypePicker}
        onClose={() => setShowRateTypePicker(false)}
        title="Vyberte typ sadzby"
      >
        <View style={styles.pickerList}>
          {RATE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.pickerItem,
                selectedRateType === type.value && styles.pickerItemSelected,
              ]}
              onPress={() => {
                setValue('rateType', type.value);
                setShowRateTypePicker(false);
              }}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  selectedRateType === type.value && styles.pickerItemTextSelected,
                ]}
              >
                {type.label}
              </Text>
              {selectedRateType === type.value && (
                <Text style={styles.checkmark}>✓</Text>
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
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
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
    color: '#92400e',
    lineHeight: 20,
  },
  form: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  pickerButtonError: {
    borderColor: '#ef4444',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  chevron: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  buttons: {
    marginTop: 24,
  },
  pickerList: {
    maxHeight: 300,
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
  pickerItemSelected: {
    backgroundColor: '#f5f3ff',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerItemTextSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#8b5cf6',
  },
});

