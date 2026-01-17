import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createExpenseSchema } from '@finapp/core';
import { FormInput } from '@/components/forms/FormInput';
import { FormDatePicker } from '@/components/forms/FormDatePicker';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { createExpense, getCurrentHousehold, getCategories, type Category } from '@/lib/api';
import { Toast } from '@/components/ui/Toast';
import { CategoryPicker } from '@/components/CategoryPicker';
import { TouchableOpacity } from 'react-native-gesture-handler';

type FormData = {
  date: string;
  amount: number;
  categoryId: string;
  merchant?: string;
  note?: string;
};

export default function NewExpenseScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
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
  } = useForm<FormData>({
    resolver: zodResolver(
      createExpenseSchema.omit({ householdId: true })
    ),
    defaultValues: {
      date: new Date().toISOString(),
      amount: 0,
      categoryId: '',
      merchant: '',
      note: '',
    },
  });

  const selectedCategoryId = watch('categoryId');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const household = await getCurrentHousehold();
      setHouseholdId(household.id);

      const cats = await getCategories(household.id, 'expense');
      setCategories(cats);
      
      // Set first category as default
      if (cats.length > 0 && !selectedCategoryId) {
        setValue('categoryId', cats[0].id);
      }
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
      await createExpense({
        householdId,
        date: data.date,
        categoryId: data.categoryId,
        amount: data.amount,
        merchant: data.merchant || undefined,
        note: data.note || undefined,
      });

      showToast('Výdavok bol úspešne vytvorený', 'success');
      // Navigate to expenses list explicitly instead of router.back()
      setTimeout(() => {
        router.replace('/(tabs)/expenses');
      }, 1500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa vytvoriť výdavok',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Nový výdavok</Text>
          <Text style={styles.subtitle}>Zaznamenajte nový výdavok</Text>

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
              name="merchant"
              label="Obchodník"
              placeholder="Názov obchodu"
            />

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
                loading={loading}
                disabled={loading}
                fullWidth
              >
                Uložiť výdavok
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

      <CategoryPicker
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={(categoryId) => setValue('categoryId', categoryId)}
        householdId={householdId}
        kind="expense"
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

