import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { type Income, type Category } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

export default function IncomeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState<Income | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    loadIncome();
  }, [id]);

  const loadIncome = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: incomeData, error: incomeError } = await supabase
        .from('incomes')
        .select('*')
        .eq('id', id)
        .single();

      if (incomeError) throw incomeError;
      if (!incomeData) throw new Error('Príjem nebol nájdený');

      setIncome(incomeData);

      if (incomeData.category_id) {
        const { data: categoryData } = await supabase
          .from('categories')
          .select('*')
          .eq('id', incomeData.category_id)
          .single();

        if (categoryData) setCategory(categoryData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať príjem');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Zmazať príjem',
      'Naozaj chcete zmazať tento príjem?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('incomes')
                .delete()
                .eq('id', id);

              if (error) throw error;

              showToast('Príjem bol zmazaný', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              setTimeout(() => {
                router.back();
              }, 1500);
            } catch (error) {
              showToast('Nepodarilo sa zmazať príjem', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('sk-SK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  if (error || !income) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Príjem nebol nájdený'}</Text>
          <Button onPress={() => router.back()} variant="outline">
            Späť
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Amount Card */}
          <Card style={styles.amountCard}>
            <Text style={styles.amountLabel}>Suma</Text>
            <Text style={styles.amount}>{formatCurrency(income.amount)}</Text>
          </Card>

          {/* Details Card */}
          <Card>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dátum</Text>
              <Text style={styles.detailValue}>{formatDate(income.date)}</Text>
            </View>

            {category && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kategória</Text>
                <Badge variant="success">{category.name}</Badge>
              </View>
            )}

            {income.source && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Zdroj</Text>
                <Text style={styles.detailValue}>{income.source}</Text>
              </View>
            )}

            {income.note && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Poznámka</Text>
                <Text style={styles.detailValueMultiline}>{income.note}</Text>
              </View>
            )}
          </Card>

          {/* Audit Info Card */}
          <Card>
            <Text style={styles.sectionTitle}>Audit Trail</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vytvorené</Text>
              <Text style={styles.detailValueSmall}>
                {formatDateTime(income.created_at)}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          onPress={() => router.push(`/(tabs)/incomes/${id}/edit`)}
          variant="primary"
          fullWidth
        >
          Upraviť
        </Button>
        <Button
          onPress={handleDelete}
          variant="destructive"
          fullWidth
          style={{ marginTop: 12 }}
        >
          Zmazať
        </Button>
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
    </View>
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
    paddingBottom: 100,
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
  amountCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  amount: {
    fontSize: 40,
    fontWeight: '700',
    color: '#10b981',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
  detailValueMultiline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
  detailValueSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});

