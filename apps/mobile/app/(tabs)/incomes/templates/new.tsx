import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  createIncomeTemplate,
  getCategories,
  Category,
} from '@/lib/api';
import { getCurrentHousehold } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const templateSchema = z.object({
  name: z.string().min(1, 'Názov je povinný'),
  amount: z
    .string()
    .min(1, 'Zadajte sumu')
    .refine((s) => !isNaN(Number(s)) && Number(s) > 0, 'Suma musí byť väčšia ako 0'),
  category_id: z.string().min(1, 'Vyberte kategóriu'),
  source: z.string().optional(),
  note: z.string().optional(),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export default function NewTemplateScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      amount: '',
      category_id: '',
      source: '',
      note: '',
    },
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const household = await getCurrentHousehold();
      const cats = await getCategories(household.id, 'income');
      setCategories(cats);
      if (cats.length > 0) {
        setValue('category_id', cats[0].id);
      }
    } catch (err) {
      setError('Nepodarilo sa načítať kategórie');
      console.error('Failed to load categories:', err);
    }
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Skontrolujte, prosím, všetky polia');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = {
        name: watch('name'),
        amount: Number(watch('amount')),
        category_id: watch('category_id'),
        source: watch('source'),
        note: watch('note'),
      };

      await createIncomeTemplate(data);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Úspešne', 'Šablóna bola vytvorená');
      router.back();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nepodarilo sa vytvoriť šablónu';
      setError(message);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = categories.map((cat) => ({
    label: cat.name,
    value: cat.id,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nová šablóna</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        <View style={styles.form}>
          <Input
            label="Názov šablóny"
            placeholder="napr. Mesačný plat"
            value={watch('name')}
            onChangeText={(value) => setValue('name', value)}
            error={errors.name?.message}
          />

          <Input
            label="Suma (€)"
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={watch('amount') || ''}
            onChangeText={(value) => setValue('amount', value)}
            error={errors.amount?.message}
          />

          <View>
            <Text style={styles.label}>Kategória príjmu *</Text>
            <Select
              options={categoryOptions}
              value={watch('category_id')}
              onChange={(value) => setValue('category_id', value)}
              error={errors.category_id?.message}
            />
          </View>

          <Input
            label="Zdroj príjmu (voliteľné)"
            placeholder="napr. Zamestnávateľ XYZ"
            value={watch('source') || ''}
            onChangeText={(value) => setValue('source', value)}
          />

          <Input
            label="Poznámka (voliteľné)"
            placeholder="Dodatočné informácie"
            value={watch('note') || ''}
            onChangeText={(value) => setValue('note', value)}
            multiline
          />

          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>💡 Informácia</Text>
            <Text style={styles.infoText}>
              Túto šablónu môžete neskôr rýchlo použiť na vytvorenie príjmu v aktuálny deň.
            </Text>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !isValid}
          fullWidth
          style={styles.button}
        >
          Vytvoriť šablónu
        </Button>
        <Button
          onPress={() => router.back()}
          variant="outline"
          fullWidth
          style={styles.button}
        >
          Zrušiť
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fee',
    borderColor: '#f55',
    borderWidth: 1,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
  },
  form: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  infoCard: {
    marginTop: 16,
    backgroundColor: '#f0f9ff',
    borderColor: '#0ea5e9',
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0ea5e9',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#0c7db8',
    lineHeight: 18,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 12,
    gap: 8,
  },
  button: {
    marginBottom: 4,
  },
});
