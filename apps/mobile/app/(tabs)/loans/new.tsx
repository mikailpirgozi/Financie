import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLoanSchema } from '@finapp/core';
import { FormInput } from '@/components/forms/FormInput';
import { FormDatePicker } from '@/components/forms/FormDatePicker';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getCurrentHousehold } from '@/lib/api';
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

export default function NewLoanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [householdId, setHouseholdId] = useState<string>('');
  const [showLoanTypePicker, setShowLoanTypePicker] = useState(false);
  const [showRateTypePicker, setShowRateTypePicker] = useState(false);
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
  } = useForm<FormData>({
    resolver: zodResolver(
      createLoanSchema.omit({ householdId: true, dayCountConvention: true })
    ),
    defaultValues: {
      lender: '',
      loanType: 'annuity',
      principal: 0,
      annualRate: 0,
      rateType: 'fixed',
      startDate: new Date().toISOString(),
      termMonths: 12,
      feeSetup: 0,
      feeMonthly: 0,
    },
  });

  const selectedLoanType = watch('loanType');
  const selectedRateType = watch('rateType');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const household = await getCurrentHousehold();
      setHouseholdId(household.id);
    } catch (error) {
      showToast('Nepodarilo sa načítať dáta', 'error');
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

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          householdId,
          lender: data.lender,
          loanType: data.loanType,
          principal: data.principal,
          annualRate: data.annualRate,
          rateType: data.rateType,
          dayCountConvention: '30E/360',
          startDate: new Date(data.startDate).toISOString(),
          termMonths: data.termMonths,
          feeSetup: data.feeSetup || 0,
          feeMonthly: data.feeMonthly || 0,
          insuranceMonthly: 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodarilo sa vytvoriť úver');
      }

      showToast('Úver bol úspešne vytvorený', 'success');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa vytvoriť úver',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const getLoanTypeLabel = (value: string): string => {
    return LOAN_TYPES.find((t) => t.value === value)?.label || value;
  };

  const getRateTypeLabel = (value: string): string => {
    return RATE_TYPES.find((t) => t.value === value)?.label || value;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Nový úver</Text>
          <Text style={styles.subtitle}>Zaznamenajte nový úver</Text>

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
                <Text style={styles.errorText}>{errors.loanType.message}</Text>
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
                <Text style={styles.errorText}>{errors.rateType.message}</Text>
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
                loading={loading}
                disabled={loading}
                fullWidth
              >
                Vytvoriť úver
              </Button>
              <Button
                onPress={() => router.back()}
                variant="outline"
                disabled={loading}
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
  errorText: {
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

