import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  calculateLoanData,
  LOAN_TYPE_INFO,
  LOAN_TYPE_OPTIONS,
  RATE_TYPE_OPTIONS,
  LOAN_TERM_PRESETS,
  loanTypeSchema,
  type LoanType,
} from '@finapp/core';
import { SmartSlider } from '@/components/loans/SmartSlider';
import { LenderSelect } from '@/components/loans/LenderSelect';
import { LoanModeSelector } from '@/components/loans/LoanModeSelector';
import { LoanPreviewCard } from '@/components/loans/LoanPreviewCard';
import { FormInput, FormDatePicker } from '@/components/forms';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useCreateLoan } from '@/hooks/useLoans';
import { getCurrentHousehold, getVehicles, type Vehicle } from '@/lib/api';
import { linkLoanToAsset } from '@/lib/api-portfolio';

// Form schema - frontend validation
const newLoanFormSchema = z.object({
  name: z.string().max(200).optional(),
  vehicleId: z.string().optional(), // Optional vehicle to link
  lender: z.string().min(1, 'Veriteľ je povinný'),
  loanType: loanTypeSchema,
  principal: z.number().positive('Výška úveru musí byť väčšia ako 0'),
  annualRate: z.number().min(0).max(100).optional(),
  monthlyPayment: z.number().positive().optional(),
  termMonths: z.number().int().positive('Doba splácania je povinná'),
  startDate: z.string().min(1, 'Dátum začiatku je povinný'),
  rateType: z.enum(['fixed', 'variable']),
  feeSetup: z.number().min(0).optional(),
  feeMonthly: z.number().min(0).optional(),
  insuranceMonthly: z.number().min(0).optional(),
  balloonAmount: z.number().min(0).optional(),
  calculationMode: z.enum(['rate_term', 'payment_term', 'rate_payment']),
});

type FormData = z.infer<typeof newLoanFormSchema>;

// Formatters
const formatCurrency = (v: number) => `${v.toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const formatPercentage = (v: number) => `${v.toFixed(1)}%`;
const formatTermMonths = (v: number) => {
  const years = Math.floor(v / 12);
  const months = v % 12;
  if (years > 0 && months > 0) return `${years} r. ${months} m.`;
  if (years > 0) return `${years} ${years === 1 ? 'rok' : years < 5 ? 'roky' : 'rokov'}`;
  return `${months} mes.`;
};

export default function NewLoanScreen() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showLoanTypePicker, setShowLoanTypePicker] = useState(false);
  const [showRateTypePicker, setShowRateTypePicker] = useState(false);
  const [showTermPicker, setShowTermPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({ visible: false, message: '', type: 'success' });

  // React Query mutation
  const { mutateAsync: createLoan, isPending: loading } = useCreateLoan();

  // Form setup with react-hook-form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(newLoanFormSchema),
    defaultValues: {
      name: '',
      vehicleId: '',
      lender: '',
      loanType: 'annuity',
      principal: 10000,
      annualRate: 5.5,
      monthlyPayment: 250,
      termMonths: 60,
      startDate: new Date().toISOString().split('T')[0] ?? '',
      rateType: 'fixed',
      feeSetup: 0,
      feeMonthly: 0,
      insuranceMonthly: 0,
      balloonAmount: 0,
      calculationMode: 'payment_term', // Most common: user knows payment + term
    },
  });

  // Watch form values for calculations
  const formValues = watch();

  // Load household ID on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Unsaved changes warning
  useEffect(() => {
    const handleBackPress = () => {
      if (isDirty) {
        Alert.alert(
          'Neuložené zmeny',
          'Máte neuložené zmeny. Naozaj chcete odísť?',
          [
            { text: 'Zostať', style: 'cancel' },
            { text: 'Odísť', style: 'destructive', onPress: () => router.back() },
          ]
        );
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [isDirty, router]);

  const loadInitialData = async () => {
    try {
      const household = await getCurrentHousehold();
      setHouseholdId(household.id);
      
      // Load vehicles for selection
      try {
        const vehiclesResponse = await getVehicles(household.id);
        setVehicles(vehiclesResponse.data);
      } catch {
        // Vehicles loading is optional, don't fail the form
        console.warn('Failed to load vehicles');
      }
    } catch {
      showToast('Nepodarilo sa načítať dáta', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  // Calculate loan data with memoization
  const calculatedData = useMemo(() => {
    if (isInitializing) return null;

    try {
      return calculateLoanData({
        loanType: formValues.loanType,
        principal: formValues.principal,
        annualRate: formValues.calculationMode !== 'payment_term' ? formValues.annualRate : undefined,
        monthlyPayment: formValues.calculationMode !== 'rate_term' ? formValues.monthlyPayment : undefined,
        termMonths: formValues.calculationMode !== 'rate_payment' ? formValues.termMonths : undefined,
        startDate: new Date(formValues.startDate),
        feeSetup: formValues.feeSetup ?? 0,
        feeMonthly: formValues.feeMonthly ?? 0,
        insuranceMonthly: formValues.insuranceMonthly ?? 0,
        balloonAmount: formValues.loanType === 'interest_only' ? formValues.balloonAmount : undefined,
        calculationMode: formValues.calculationMode,
      });
    } catch {
      return null;
    }
  }, [
    isInitializing,
    formValues.loanType,
    formValues.principal,
    formValues.annualRate,
    formValues.monthlyPayment,
    formValues.termMonths,
    formValues.startDate,
    formValues.feeSetup,
    formValues.feeMonthly,
    formValues.insuranceMonthly,
    formValues.balloonAmount,
    formValues.calculationMode,
  ]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  }, []);

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert(
        'Neuložené zmeny',
        'Máte neuložené zmeny. Naozaj chcete odísť?',
        [
          { text: 'Zostať', style: 'cancel' },
          { text: 'Odísť', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!householdId) {
      showToast('Chýba ID domácnosti', 'error');
      return;
    }

    if (!calculatedData?.isValid) {
      showToast('Neplatné parametre úveru', 'error');
      return;
    }

    try {
      const finalRate = calculatedData.calculatedRate ?? data.annualRate ?? 0;
      const finalTerm = calculatedData.calculatedTerm ?? data.termMonths;
      const finalPayment = calculatedData.calculatedPayment ?? data.monthlyPayment;

      const result = await createLoan({
        householdId,
        name: data.name || undefined,
        lender: data.lender,
        loanType: data.loanType,
        principal: data.principal,
        annualRate: finalRate,
        rateType: data.rateType,
        startDate: new Date(data.startDate),
        termMonths: finalTerm,
        feeSetup: data.feeSetup ?? 0,
        feeMonthly: data.feeMonthly ?? 0,
        insuranceMonthly: data.insuranceMonthly ?? 0,
        balloonAmount: data.loanType === 'interest_only' ? data.balloonAmount : undefined,
        fixedMonthlyPayment: data.loanType !== 'fixed_principal' ? finalPayment : undefined,
      });

      // Link to vehicle if selected
      if (data.vehicleId && result.loan?.id) {
        try {
          await linkLoanToAsset(result.loan.id, data.vehicleId);
        } catch (linkError) {
          // Log but don't fail - loan was created successfully
          console.warn('Failed to link loan to vehicle:', linkError);
        }
      }

      showToast('Úver bol úspešne vytvorený', 'success');
      setTimeout(() => router.back(), 1000);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa vytvoriť úver',
        'error'
      );
    }
  };

  const getLoanTypeLabel = (value: LoanType): string => {
    return LOAN_TYPE_OPTIONS.find(t => t.value === value)?.label || value;
  };

  const getRateTypeLabel = (value: string): string => {
    return RATE_TYPE_OPTIONS.find(t => t.value === value)?.label || value;
  };

  const loanTypeInfo = LOAN_TYPE_INFO[formValues.loanType];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>Nový úver</Text>
            <Text style={styles.subtitle}>
              Zadajte údaje - systém automaticky dopočíta chýbajúce hodnoty
            </Text>

            {/* Section: Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Základné informácie</Text>

              {/* Name (optional) */}
              <FormInput
                control={control}
                name="name"
                label="Názov úveru (voliteľné)"
                placeholder="napr. Auto BMW X5, Hypotéka..."
                maxLength={200}
              />

              {/* Vehicle selection (optional) */}
              {vehicles.length > 0 && (
                <Controller
                  control={control}
                  name="vehicleId"
                  render={({ field: { onChange, value } }) => (
                    <Select
                      label="Priradiť k vozidlu (voliteľné)"
                      value={value}
                      onChange={onChange}
                      placeholder="Vyberte vozidlo..."
                      options={[
                        { label: '— Bez priradenia —', value: '' },
                        ...vehicles.map((v) => ({
                          label: v.name + (v.licensePlate ? ` (${v.licensePlate})` : ''),
                          value: v.id,
                        })),
                      ]}
                      disabled={loading}
                      searchable={vehicles.length > 5}
                    />
                  )}
                />
              )}

              {/* Lender */}
              <Controller
                control={control}
                name="lender"
                render={({ field: { onChange, value } }) => (
                  <LenderSelect
                    value={value}
                    onChange={onChange}
                    disabled={loading}
                    error={errors.lender?.message}
                  />
                )}
              />

              {/* Loan Type */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Typ úveru *</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, errors.loanType && styles.pickerButtonError]}
                  onPress={() => setShowLoanTypePicker(true)}
                  disabled={loading}
                >
                  <Text style={styles.pickerButtonText}>
                    {getLoanTypeLabel(formValues.loanType)}
                  </Text>
                  <Text style={styles.chevron}>▼</Text>
                </TouchableOpacity>
                <Text style={styles.hint}>{loanTypeInfo.description}</Text>
              </View>

              {/* Rate Type */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Typ sadzby *</Text>
                <TouchableOpacity
                  style={[styles.pickerButton, errors.rateType && styles.pickerButtonError]}
                  onPress={() => setShowRateTypePicker(true)}
                  disabled={loading}
                >
                  <Text style={styles.pickerButtonText}>
                    {getRateTypeLabel(formValues.rateType)}
                  </Text>
                  <Text style={styles.chevron}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Start Date */}
              <FormDatePicker
                control={control}
                name="startDate"
                label="Dátum začiatku *"
                locale="sk-SK"
              />
            </View>

            <View style={styles.sectionDivider} />

            {/* Section: Loan Parameters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Parametre úveru</Text>

              {/* Principal Slider */}
              <Controller
                control={control}
                name="principal"
                render={({ field: { onChange, value } }) => (
                  <SmartSlider
                    label="Výška úveru *"
                    value={value}
                    onValueChange={onChange}
                    minimumValue={100}
                    maximumValue={500000}
                    step={100}
                    suffix=" €"
                    formatDisplay={formatCurrency}
                    disabled={loading}
                  />
                )}
              />
              {errors.principal && (
                <Text style={styles.errorText}>{errors.principal.message}</Text>
              )}

              {/* Calculation Mode */}
              <Controller
                control={control}
                name="calculationMode"
                render={({ field: { onChange, value } }) => (
                  <LoanModeSelector
                    value={value}
                    onChange={onChange}
                    disabled={loading}
                  />
                )}
              />

              {/* Conditional fields based on calculation mode */}
              {formValues.calculationMode !== 'payment_term' && (
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
                      disabled={loading}
                    />
                  )}
                />
              )}

              {formValues.calculationMode !== 'rate_term' && (
                <Controller
                  control={control}
                  name="monthlyPayment"
                  render={({ field: { onChange, value } }) => (
                    <SmartSlider
                      label="Mesačná splátka *"
                      value={value ?? 0}
                      onValueChange={onChange}
                      minimumValue={50}
                      maximumValue={10000}
                      step={10}
                      suffix=" €"
                      formatDisplay={formatCurrency}
                      disabled={loading}
                    />
                  )}
                />
              )}

              {formValues.calculationMode !== 'rate_payment' && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.label}>Doba splácania *</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowTermPicker(true)}
                    disabled={loading}
                  >
                    <Text style={styles.pickerButtonText}>
                      {formatTermMonths(formValues.termMonths)}
                    </Text>
                    <Text style={styles.chevron}>▼</Text>
                  </TouchableOpacity>

                  {/* Term slider for fine-tuning */}
                  <Controller
                    control={control}
                    name="termMonths"
                    render={({ field: { onChange, value } }) => (
                      <SmartSlider
                        label=""
                        value={value}
                        onValueChange={onChange}
                        minimumValue={6}
                        maximumValue={360}
                        step={1}
                        suffix=" mes."
                        formatDisplay={formatTermMonths}
                        disabled={loading}
                      />
                    )}
                  />
                </View>
              )}
            </View>

            {/* Calculated values display */}
            {calculatedData?.isValid && (
              <View style={styles.calculatedSection}>
                {calculatedData.calculatedRate !== null && (
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

                {calculatedData.calculatedTerm !== null && (
                  <View style={styles.calculatedBox}>
                    <Text style={styles.calculatedIcon}>✓</Text>
                    <View style={styles.calculatedContent}>
                      <Text style={styles.calculatedText}>
                        Doba: {formatTermMonths(calculatedData.calculatedTerm)}
                      </Text>
                      <Text style={styles.calculatedSubtext}>(vypočítané)</Text>
                    </View>
                  </View>
                )}

                {calculatedData.calculatedPayment !== null && (
                  <View style={styles.calculatedBox}>
                    <Text style={styles.calculatedIcon}>✓</Text>
                    <View style={styles.calculatedContent}>
                      <Text style={styles.calculatedText}>
                        Splátka: {formatCurrency(calculatedData.calculatedPayment)}
                      </Text>
                      <Text style={styles.calculatedSubtext}>(vypočítané)</Text>
                    </View>
                  </View>
                )}

                <View style={styles.infoBox}>
                  <Text style={styles.infoIcon}>📊</Text>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoText}>
                      RPMN: {calculatedData.effectiveRate.toFixed(2)}%
                    </Text>
                    <Text style={styles.infoSubtext}>
                      (skutočná ročná percentuálna miera nákladov)
                    </Text>
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoIcon}>💰</Text>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoText}>
                      Celkový úrok: {formatCurrency(calculatedData.totalInterest)}
                    </Text>
                    <Text style={styles.infoSubtext}>
                      ({((calculatedData.totalInterest / formValues.principal) * 100).toFixed(1)}% z istiny)
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.sectionDivider} />

            {/* Advanced Settings */}
            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={styles.advancedTitle}>Poplatky (voliteľné)</Text>
              <Text style={styles.chevron}>{showAdvanced ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showAdvanced && (
              <View style={styles.advancedContent}>
                <Text style={styles.advancedHint}>
                  Poplatky ovplyvňujú RPMN (skutočnú cenu úveru)
                </Text>

                <Controller
                  control={control}
                  name="feeSetup"
                  render={({ field: { onChange, value } }) => (
                    <SmartSlider
                      label="Poplatok za zriadenie"
                      value={value ?? 0}
                      onValueChange={onChange}
                      minimumValue={0}
                      maximumValue={5000}
                      step={10}
                      suffix=" €"
                      formatDisplay={formatCurrency}
                      disabled={loading}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="feeMonthly"
                  render={({ field: { onChange, value } }) => (
                    <SmartSlider
                      label="Mesačný poplatok"
                      value={value ?? 0}
                      onValueChange={onChange}
                      minimumValue={0}
                      maximumValue={100}
                      step={0.5}
                      suffix=" €"
                      formatDisplay={formatCurrency}
                      disabled={loading}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="insuranceMonthly"
                  render={({ field: { onChange, value } }) => (
                    <SmartSlider
                      label="Mesačné poistenie"
                      value={value ?? 0}
                      onValueChange={onChange}
                      minimumValue={0}
                      maximumValue={200}
                      step={1}
                      suffix=" €"
                      formatDisplay={formatCurrency}
                      disabled={loading}
                    />
                  )}
                />

                {formValues.loanType === 'interest_only' && (
                  <Controller
                    control={control}
                    name="balloonAmount"
                    render={({ field: { onChange, value } }) => (
                      <SmartSlider
                        label="Balónová splátka (na konci)"
                        value={value ?? 0}
                        onValueChange={onChange}
                        minimumValue={0}
                        maximumValue={formValues.principal}
                        step={100}
                        suffix=" €"
                        formatDisplay={formatCurrency}
                        disabled={loading}
                      />
                    )}
                  />
                )}
              </View>
            )}

            <View style={styles.sectionDivider} />

            {/* Preview */}
            <LoanPreviewCard result={calculatedData} principal={formValues.principal} />

            {/* Buttons */}
            <View style={styles.buttons}>
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                disabled={loading || !calculatedData?.isValid}
                fullWidth
              >
                Vytvoriť úver
              </Button>
              <Button
                onPress={handleCancel}
                variant="outline"
                disabled={loading}
                fullWidth
                style={styles.cancelButton}
              >
                Zrušiť
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Loan Type Picker Modal */}
      <Modal
        visible={showLoanTypePicker}
        onClose={() => setShowLoanTypePicker(false)}
        title="Typ úveru"
      >
        <View style={styles.pickerList}>
          {LOAN_TYPE_OPTIONS.map((type) => {
            const info = LOAN_TYPE_INFO[type.value as LoanType];
            const isSelected = formValues.loanType === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                onPress={() => {
                  setValue('loanType', type.value as LoanType, { shouldDirty: true });
                  setShowLoanTypePicker(false);
                }}
              >
                <View style={styles.pickerItemContent}>
                  <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                    {type.label}
                  </Text>
                  <Text style={styles.pickerItemDescription}>{info.description}</Text>
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* Rate Type Picker Modal */}
      <Modal
        visible={showRateTypePicker}
        onClose={() => setShowRateTypePicker(false)}
        title="Typ sadzby"
      >
        <View style={styles.pickerList}>
          {RATE_TYPE_OPTIONS.map((type) => {
            const isSelected = formValues.rateType === type.value;
            return (
              <TouchableOpacity
                key={type.value}
                style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                onPress={() => {
                  setValue('rateType', type.value as 'fixed' | 'variable', { shouldDirty: true });
                  setShowRateTypePicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                  {type.label}
                </Text>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>

      {/* Term Presets Picker Modal */}
      <Modal
        visible={showTermPicker}
        onClose={() => setShowTermPicker(false)}
        title="Doba splácania"
      >
        <View style={styles.pickerList}>
          {LOAN_TERM_PRESETS.map((preset) => {
            const isSelected = formValues.termMonths === preset.value;
            return (
              <TouchableOpacity
                key={preset.value}
                style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                onPress={() => {
                  setValue('termMonths', preset.value, { shouldDirty: true });
                  setShowTermPicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                  {preset.label}
                </Text>
                <Text style={styles.pickerItemSubtext}>{preset.value} mesiacov</Text>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
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
  inputWrapper: {
    marginBottom: 0,
  },
  textInputContainer: {
    marginBottom: 0,
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
  hint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 24,
  },
  calculatedSection: {
    marginTop: 16,
  },
  calculatedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#854d0e',
  },
  infoSubtext: {
    fontSize: 11,
    color: '#a16207',
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
    marginBottom: 16,
  },
  buttons: {
    marginTop: 24,
  },
  cancelButton: {
    marginTop: 12,
  },
  pickerList: {
    maxHeight: 400,
    paddingBottom: 20,
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
    marginBottom: 2,
  },
  pickerItemTextSelected: {
    color: '#8b5cf6',
    fontWeight: '600',
  },
  pickerItemDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  pickerItemSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 12,
  },
  checkmark: {
    fontSize: 18,
    color: '#8b5cf6',
  },
});
