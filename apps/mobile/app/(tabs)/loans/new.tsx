import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  calculateLoanData,
  LOAN_TYPE_INFO,
  type LoanCalculationMode,
  type LoanType,
} from '@finapp/core';
import { SmartSlider } from '@/components/loans/SmartSlider';
import { LenderSelect } from '@/components/loans/LenderSelect';
import { LoanModeSelector } from '@/components/loans/LoanModeSelector';
import { LoanPreviewCard } from '@/components/loans/LoanPreviewCard';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { getCurrentHousehold } from '@/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

const LOAN_TYPES: Array<{ value: LoanType; label: string }> = [
  { value: 'annuity', label: '💳 Anuitný' },
  { value: 'fixed_principal', label: '📉 Fixná istina' },
  { value: 'interest_only', label: '🎈 Interest-only' },
  { value: 'auto_loan', label: '🚗 Auto úver' },
];

export default function NewLoanScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [householdId, setHouseholdId] = useState<string>('');
  const [showLoanTypePicker, setShowLoanTypePicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const [formData, setFormData] = useState({
    name: '',
    lender: '',
    loanType: 'annuity' as LoanType,
    principal: 10000,
    annualRate: 5.5,
    monthlyPayment: 250,
    termMonths: 60,
    startDate: new Date().toISOString().split('T')[0] ?? '',
    feeSetup: 0,
    feeMonthly: 0,
    insuranceMonthly: 0,
    balloonAmount: 0,
    calculationMode: 'payment_term' as LoanCalculationMode,
  });

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

  // Calculate loan with memoized calculator
  const calculatedData = useMemo(
    () =>
      calculateLoanData({
        loanType: formData.loanType,
        principal: formData.principal,
        annualRate:
          formData.calculationMode !== 'payment_term' ? formData.annualRate : undefined,
        monthlyPayment:
          formData.calculationMode !== 'rate_term' ? formData.monthlyPayment : undefined,
        termMonths:
          formData.calculationMode !== 'rate_payment' ? formData.termMonths : undefined,
        startDate: new Date(formData.startDate),
        feeSetup: formData.feeSetup,
        feeMonthly: formData.feeMonthly,
        insuranceMonthly: formData.insuranceMonthly,
        balloonAmount:
          formData.loanType === 'interest_only' ? formData.balloonAmount : undefined,
        calculationMode: formData.calculationMode,
      }),
    [
      formData.loanType,
      formData.principal,
      formData.annualRate,
      formData.monthlyPayment,
      formData.termMonths,
      formData.startDate,
      formData.feeSetup,
      formData.feeMonthly,
      formData.insuranceMonthly,
      formData.balloonAmount,
      formData.calculationMode,
    ]
  );

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const onSubmit = async () => {
    if (!householdId) {
      showToast('Chýba ID domácnosti', 'error');
      return;
    }

    if (!formData.lender.trim()) {
      showToast('Zadajte veriteľa', 'error');
      return;
    }

    if (!calculatedData?.isValid) {
      showToast('Prosím vyplňte všetky požadované polia', 'error');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const finalRate = calculatedData.calculatedRate ?? formData.annualRate;
      const finalTerm = calculatedData.calculatedTerm ?? formData.termMonths;
      const finalPayment = calculatedData.calculatedPayment ?? formData.monthlyPayment;

      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          householdId,
          name: formData.name || undefined,
          lender: formData.lender,
          loanType: formData.loanType,
          principal: formData.principal,
          annualRate: finalRate,
          rateType: 'fixed',
          dayCountConvention: '30E/360',
          startDate: new Date(formData.startDate).toISOString(),
          termMonths: finalTerm,
          feeSetup: formData.feeSetup || 0,
          feeMonthly: formData.feeMonthly || 0,
          insuranceMonthly: formData.insuranceMonthly || 0,
          balloonAmount:
            formData.loanType === 'interest_only' && formData.balloonAmount
              ? formData.balloonAmount
              : undefined,
          fixedMonthlyPayment:
            formData.loanType !== 'fixed_principal' ? finalPayment : undefined,
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

  const getLoanTypeLabel = (value: LoanType): string => {
    return LOAN_TYPES.find((t) => t.value === value)?.label || value;
  };

  const loanTypeInfo = LOAN_TYPE_INFO[formData.loanType];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Nový úver</Text>
          <Text style={styles.subtitle}>
            Zadajte údaje - systém automaticky dopočíta chýbajúce hodnoty
          </Text>

          {/* Name (optional) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Názov úveru</Text>
            <TextInput
              style={styles.textInput}
              placeholder="napr. Auto BMW X5, Hypotéka byt..."
              placeholderTextColor="#999"
              value={formData.name}
              onChangeText={(value) => setFormData({ ...formData, name: value })}
              editable={!loading}
              maxLength={200}
            />
            <Text style={styles.hint}>
              Vlastný popis pre jednoduchšiu identifikáciu (nepovinné)
            </Text>
          </View>

          {/* Lender */}
          <LenderSelect
            value={formData.lender}
            onChange={(value) => setFormData({ ...formData, lender: value })}
            disabled={loading}
          />

          {/* Loan Type */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Typ úveru *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowLoanTypePicker(true)}
            >
              <Text style={styles.pickerButtonText}>{getLoanTypeLabel(formData.loanType)}</Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>{loanTypeInfo.description}</Text>
          </View>

          {/* Start Date */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Dátum začiatku *</Text>
            <Text style={styles.dateValue}>{formData.startDate}</Text>
          </View>

          <View style={styles.sectionDivider} />

          {/* Principal Slider */}
          <SmartSlider
            label="💰 Výška úveru *"
            value={formData.principal}
            onValueChange={(value) => setFormData({ ...formData, principal: value })}
            minimumValue={100}
            maximumValue={500000}
            step={100}
            suffix=" €"
            formatDisplay={(v) => `${v.toLocaleString('sk-SK')} €`}
            disabled={loading}
          />

          {/* Calculation Mode */}
          <LoanModeSelector
            value={formData.calculationMode}
            onChange={(value) => setFormData({ ...formData, calculationMode: value })}
            disabled={loading}
          />

          {/* Conditional fields based on calculation mode */}
          {formData.calculationMode !== 'payment_term' && (
            <SmartSlider
              label="Úroková sadzba *"
              value={formData.annualRate}
              onValueChange={(value) => setFormData({ ...formData, annualRate: value })}
              minimumValue={0}
              maximumValue={25}
              step={0.1}
              suffix=" %"
              formatDisplay={(v) => `${v.toFixed(1)}%`}
              disabled={loading}
            />
          )}

          {formData.calculationMode !== 'rate_term' && (
            <SmartSlider
              label="Mesačná splátka *"
              value={formData.monthlyPayment}
              onValueChange={(value) => setFormData({ ...formData, monthlyPayment: value })}
              minimumValue={50}
              maximumValue={10000}
              step={10}
              suffix=" €"
              formatDisplay={(v) => `${v.toLocaleString('sk-SK')} €`}
              disabled={loading}
            />
          )}

          {formData.calculationMode !== 'rate_payment' && (
            <SmartSlider
              label="Doba splácania *"
              value={formData.termMonths}
              onValueChange={(value) => setFormData({ ...formData, termMonths: value })}
              minimumValue={12}
              maximumValue={360}
              step={6}
              suffix=" mes."
              formatDisplay={(v) => {
                const years = Math.floor(v / 12);
                const months = v % 12;
                if (years > 0 && months > 0) {
                  return `${years} r. ${months} m.`;
                } else if (years > 0) {
                  return `${years} ${years === 1 ? 'rok' : years < 5 ? 'roky' : 'rokov'}`;
                } else {
                  return `${months} mes.`;
                }
              }}
              disabled={loading}
            />
          )}

                {/* Show calculated value */}
                {calculatedData?.calculatedRate !== null && calculatedData !== null && (
                  <View style={styles.calculatedBox}>
                    <Text style={styles.calculatedIcon}>✓</Text>
                    <View style={styles.calculatedContent}>
                      <Text style={styles.calculatedText}>
                        Úrok: {calculatedData.calculatedRate.toFixed(2)}% ročne
                      </Text>
                      <Text style={styles.calculatedSubtext}>(vypočítané)</Text>
                    </View>
                  </View>
                )}

                {calculatedData?.calculatedTerm !== null && calculatedData !== null && (
                  <View style={styles.calculatedBox}>
                    <Text style={styles.calculatedIcon}>✓</Text>
                    <View style={styles.calculatedContent}>
                      <Text style={styles.calculatedText}>
                        Doba: {calculatedData.calculatedTerm} mesiacov
                      </Text>
                      <Text style={styles.calculatedSubtext}>(vypočítané)</Text>
                    </View>
                  </View>
                )}

                {calculatedData?.calculatedPayment !== null && calculatedData !== null && (
                  <View style={styles.calculatedBox}>
                    <Text style={styles.calculatedIcon}>✓</Text>
                    <View style={styles.calculatedContent}>
                      <Text style={styles.calculatedText}>
                        Splátka: {calculatedData.calculatedPayment.toFixed(2)} €
                      </Text>
                      <Text style={styles.calculatedSubtext}>(vypočítané)</Text>
                    </View>
                  </View>
                )}

          <View style={styles.sectionDivider} />

          {/* Advanced Settings Toggle */}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <Text style={styles.advancedTitle}>⚙️ Poplatky (voliteľné)</Text>
            <Text style={styles.chevron}>{showAdvanced ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedContent}>
              <Text style={styles.advancedHint}>
                ℹ️ Poplatky ovplyvňujú RPMN (skutočnú cenu úveru)
              </Text>
              {/* Advanced fields would go here - keeping it simple for now */}
            </View>
          )}

          <View style={styles.sectionDivider} />

          {/* Preview */}
          <LoanPreviewCard result={calculatedData} principal={formData.principal} />

          {/* Buttons */}
          <View style={styles.buttons}>
            <Button
              onPress={onSubmit}
              loading={loading}
              disabled={loading || !calculatedData?.isValid}
              fullWidth
            >
              💾 Vytvoriť úver
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
      </ScrollView>

      {/* Loan Type Picker Modal */}
      <Modal
        visible={showLoanTypePicker}
        onClose={() => setShowLoanTypePicker(false)}
        title="Vyberte typ úveru"
      >
        <View style={styles.pickerList}>
          {LOAN_TYPES.map((type) => {
            const info = LOAN_TYPE_INFO[type.value];
            return (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.pickerItem,
                  formData.loanType === type.value && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setFormData({ ...formData, loanType: type.value });
                  setShowLoanTypePicker(false);
                }}
              >
                <View style={styles.pickerItemContent}>
                  <Text
                    style={[
                      styles.pickerItemText,
                      formData.loanType === type.value && styles.pickerItemTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text style={styles.pickerItemDescription}>{info.description}</Text>
                </View>
                {formData.loanType === type.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
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
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
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
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
    fontSize: 16,
    color: '#111827',
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
  hint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  dateValue: {
    fontSize: 16,
    color: '#111827',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  calculatedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  calculatedIcon: {
    fontSize: 20,
    color: '#16a34a',
    marginRight: 12,
  },
  calculatedContent: {
    flex: 1,
  },
  calculatedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
  },
  calculatedSubtext: {
    fontSize: 11,
    color: '#16a34a',
    marginTop: 2,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  advancedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  advancedContent: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  advancedHint: {
    fontSize: 12,
    color: '#6b7280',
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
  pickerItemSelected: {
    backgroundColor: '#f5f3ff',
  },
  pickerItemContent: {
    flex: 1,
    marginRight: 12,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  pickerItemTextSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  pickerItemDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  checkmark: {
    fontSize: 18,
    color: '#8b5cf6',
  },
});
