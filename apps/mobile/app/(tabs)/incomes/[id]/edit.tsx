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
import { createIncomeSchema } from '@finapp/core';
import { FormInput } from '@/components/forms/FormInput';
import { FormDatePicker } from '@/components/forms/FormDatePicker';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { getCurrentHousehold, getCategories, type Category } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/Toast';
import { CategoryPicker } from '@/components/CategoryPicker';
import { TouchableOpacity } from 'react-native-gesture-handler';

type FormData = {
  date: string;
  amount: number;
  source: string;
  categoryId: string;
  note?: string;
};

export default function EditIncomeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [householdId, setHouseholdId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
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
      createIncomeSchema.omit({ householdId: true })
    ),
  });

  const selectedCategoryId = watch('categoryId');

  useEffect(() => {
    loadIncome();
  }, [id]);

  const loadIncome = async () => {
    try {
      setLoading(true);

      const household = await getCurrentHousehold();
      setHouseholdId(household.id);

      const cats = await getCategories(household.id, 'income');
      setCategories(cats);

      const { data: incomeData, error: incomeError } = await supabase
        .from('incomes')
        .select('*')
        .eq('id', id)
        .single();

      if (incomeError) throw incomeError;
      if (!incomeData) throw new Error('Príjem nebol nájdený');

      reset({
        date: incomeData.date,
        amount: incomeData.amount,
        source: incomeData.source || '',
        categoryId: incomeData.category_id,
        note: incomeData.note || '',
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa načítať príjem',
        'error'
      );
    } finally {
      setLoading(false);
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
      const { error } = await supabase
        .from('incomes')
        .update({
          date: data.date,
          amount: data.amount,
          source: data.source,
          category_id: data.categoryId,
          note: data.note || null,
        })
        .eq('id', id);

      if (error) throw error;

      showToast('Príjem bol úspešne upravený', 'success');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa upraviť príjem',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </View>
    );
  }

  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Upraviť príjem</Text>
          <Text style={styles.subtitle}>Upravte údaje príjmu</Text>

          <View style={styles.form}>
            <FormDatePicker
              control={control}
              name="date"
              label="Dátum *"
              locale="sk-SK"
            />

            <CurrencyInput
              control={control}
              name="amount"
              label="Suma (€) *"
            />

            <FormInput
              control={control}
              name="source"
              label="Zdroj *"
              placeholder="Napr. Výplata, Bonus, Dividend"
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.label}>Kategória *</Text>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  errors.categoryId && styles.categoryButtonError,
                ]}
                onPress={() => setShowCategoryPicker(true)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    !selectedCategory && styles.placeholder,
                  ]}
                >
                  {selectedCategory ? selectedCategory.name : 'Vyberte kategóriu'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>
              {errors.categoryId && (
                <Text style={styles.errorText}>{errors.categoryId.message}</Text>
              )}
            </View>

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

      <CategoryPicker
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={(categoryId) => setValue('categoryId', categoryId)}
        householdId={householdId}
        kind="income"
        selectedCategoryId={selectedCategoryId}
      />

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
  categoryButton: {
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
  categoryButtonError: {
    borderColor: '#ef4444',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholder: {
    color: '#9ca3af',
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
});

