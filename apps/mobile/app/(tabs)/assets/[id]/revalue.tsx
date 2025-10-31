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
import { z } from 'zod';
import { FormDatePicker } from '@/components/forms/FormDatePicker';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

const revaluationSchema = z.object({
  newValue: z.number().positive('Nová hodnota musí byť väčšia ako 0'),
  date: z.string(),
});

type FormData = z.infer<typeof revaluationSchema>;

interface Asset {
  id: string;
  name: string;
  current_value: number;
}

export default function RevalueAssetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const {
    watch,
    setValue,
    handleSubmit,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(revaluationSchema),
    defaultValues: {
      newValue: 0,
      date: new Date().toISOString(),
    },
  });

  const watchedNewValue = watch('newValue');

  useEffect(() => {
    loadAsset();
  }, [id]);

  const loadAsset = async () => {
    try {
      setLoading(true);

      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('id, name, current_value')
        .eq('id', id)
        .single();

      if (assetError) throw assetError;
      if (!assetData) throw new Error('Majetok nebol nájdený');

      setAsset(assetData);
      setValue('newValue', assetData.current_value);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa načítať majetok',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const onSubmit = async (data: FormData) => {
    if (!asset) {
      showToast('Chýbajú údaje o majetku', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/assets/${id}/valuations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          newValue: data.newValue,
          valuationDate: data.date,
          source: 'manual',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Nepodarilo sa preceniť majetok');
      }

      showToast('Majetok bol úspešne precenený', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa preceniť majetok',
        'error'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Majetok nebol nájdený</Text>
          <Button onPress={() => router.back()} variant="outline">
            Späť
          </Button>
        </View>
      </View>
    );
  }

  const valueDifference = watchedNewValue - asset.current_value;
  const percentageChange = asset.current_value !== 0 ? (valueDifference / asset.current_value) * 100 : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.title}>Preceniť majetok</Text>
          <Text style={styles.subtitle}>{asset.name}</Text>

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Aktuálna hodnota</Text>
              <Text style={styles.infoValue}>{formatCurrency(asset.current_value)}</Text>
            </View>
            {watchedNewValue !== asset.current_value && (
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Zmena</Text>
                <Text
                  style={[
                    styles.changeValue,
                    { color: valueDifference > 0 ? '#10b981' : '#ef4444' },
                  ]}
                >
                  {valueDifference > 0 ? '+' : ''}
                  {formatCurrency(valueDifference)} ({valueDifference > 0 ? '+' : ''}
                  {percentageChange.toFixed(1)}%)
                </Text>
              </View>
            )}
          </Card>

          <View style={styles.form}>
            <FormDatePicker
              control={control}
              name="date"
              label="Dátum precenenia *"
              locale="sk-SK"
            />

            <CurrencyInput
              control={control}
              name="newValue"
              label="Nová hodnota (€) *"
            />

            <View style={styles.buttons}>
              <Button
                onPress={handleSubmit(onSubmit)}
                loading={saving}
                disabled={saving}
                fullWidth
              >
                Potvrdiť precenenie
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
    marginBottom: 24,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
  },
  changeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  changeLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  changeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  form: {
    gap: 4,
  },
  buttons: {
    marginTop: 24,
  },
});

