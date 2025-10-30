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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

export default function EditAssetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(
      createAssetSchema.omit({ householdId: true })
    ),
  });

  const selectedKind = watch('kind');

  useEffect(() => {
    loadAsset();
  }, [id]);

  const loadAsset = async () => {
    try {
      setInitialLoading(true);

      const household = await getCurrentHousehold();
      setHouseholdId(household.id);

      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (assetError) throw assetError;
      if (!assetData) throw new Error('Majetok nebol nájdený');

      reset({
        kind: assetData.kind as any,
        name: assetData.name,
        acquisitionValue: assetData.acquisition_value,
        currentValue: assetData.current_value,
        acquisitionDate: assetData.acquisition_date,
        indexingRuleAnnualPct: assetData.indexing_rule_annual_pct || 0,
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa načítať majetok',
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

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/assets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
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
        throw new Error(errorData.error || 'Nepodarilo sa upraviť majetok');
      }

      showToast('Majetok bol úspešne upravený', 'success');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa upraviť majetok',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const getKindLabel = (value: string): string => {
    return ASSET_KINDS.find((k) => k.value === value)?.label || value;
  };

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Načítavam...</Text>
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
          <Text style={styles.title}>Upraviť majetok</Text>
          <Text style={styles.subtitle}>Upravte údaje majetku</Text>

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

