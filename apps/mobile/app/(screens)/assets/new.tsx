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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAssetSchema } from '@finapp/core';
import { FormInput } from '@/components/forms/FormInput';
import { FormDatePicker } from '@/components/forms/FormDatePicker';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { getCurrentHousehold } from '@/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/Toast';

const ASSET_KINDS = [
  { value: 'real_estate', label: '🏠 Nehnuteľnosť' },
  { value: 'vehicle', label: '🚗 Vozidlo' },
  { value: 'business', label: '💼 Podnik' },
  { value: 'loan_receivable', label: '💰 Pohľadávka' },
  { value: 'other', label: '📦 Ostatné' },
] as const;

type FormData = {
  kind: 'real_estate' | 'vehicle' | 'business' | 'loan_receivable' | 'other';
  name: string;
  acquisitionValue: number;
  currentValue: number;
  acquisitionDate: string;
  indexingRuleAnnualPct?: number;
};

export default function NewAssetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [householdId, setHouseholdId] = useState<string>('');
  const [showKindPicker, setShowKindPicker] = useState(false);
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
      createAssetSchema.omit({ householdId: true })
    ),
    defaultValues: {
      kind: 'real_estate',
      name: '',
      acquisitionValue: 0,
      currentValue: 0,
      acquisitionDate: new Date().toISOString(),
      indexingRuleAnnualPct: 0,
    },
  });

  const selectedKind = watch('kind');

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
      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          householdId,
          kind: data.kind,
          name: data.name,
          acquisitionValue: data.acquisitionValue,
          currentValue: data.currentValue,
          acquisitionDate: new Date(data.acquisitionDate).toISOString(),
          indexingRuleAnnualPct: data.indexingRuleAnnualPct || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodarilo sa vytvoriť majetok');
      }

      showToast('Majetok bol úspešne vytvorený', 'success');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa vytvoriť majetok',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const getKindLabel = (value: string): string => {
    return ASSET_KINDS.find((k) => k.value === value)?.label || value;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Nový majetok</Text>
          <Text style={styles.subtitle}>Zaznamenajte nový majetok</Text>

          <View style={styles.form}>
            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Typ majetku *</Text>
              <TouchableOpacity
                style={[
                  styles.pickerButton,
                  errors.kind && styles.pickerButtonError,
                ]}
                onPress={() => setShowKindPicker(true)}
              >
                <Text style={styles.pickerButtonText}>
                  {getKindLabel(selectedKind)}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
              {errors.kind && (
                <Text style={styles.errorText}>{errors.kind.message}</Text>
              )}
            </View>

            <FormInput
              control={control}
              name="name"
              label="Názov *"
              placeholder="Napr. Dom Bratislava, Auto BMW"
            />

            <CurrencyInput
              control={control}
              name="acquisitionValue"
              label="Obstarávacia hodnota (€) *"
            />

            <CurrencyInput
              control={control}
              name="currentValue"
              label="Aktuálna hodnota (€) *"
            />

            <FormDatePicker
              control={control}
              name="acquisitionDate"
              label="Dátum obstarania *"
              locale="sk-SK"
            />

            <FormInput
              control={control}
              name="indexingRuleAnnualPct"
              label="Ročné zhodnotenie (%)"
              placeholder="Napr. 3.5"
              keyboardType="decimal-pad"
            />

            <View style={styles.buttons}>
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                disabled={loading}
                fullWidth
              >
                Uložiť majetok
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

      {/* Kind Picker Modal */}
      <Modal
        visible={showKindPicker}
        onClose={() => setShowKindPicker(false)}
        title="Vyberte typ majetku"
      >
        <View style={styles.pickerList}>
          {ASSET_KINDS.map((kind) => (
            <TouchableOpacity
              key={kind.value}
              style={[
                styles.pickerItem,
                selectedKind === kind.value && styles.pickerItemSelected,
              ]}
              onPress={() => {
                setValue('kind', kind.value);
                setShowKindPicker(false);
              }}
            >
              <Text
                style={[
                  styles.pickerItemText,
                  selectedKind === kind.value && styles.pickerItemTextSelected,
                ]}
              >
                {kind.label}
              </Text>
              {selectedKind === kind.value && (
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
    backgroundColor: '#fef3c7',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerItemTextSelected: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#f59e0b',
  },
});

