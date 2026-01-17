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
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

interface ExpenseData {
  id: string;
  household_id: string;
  date: string;
  amount: number;
  description?: string;
  merchant?: string;
  note?: string;
  category_id: string;
  created_at: string;
  updated_at: string;
}

interface CategoryData {
  id: string;
  household_id: string;
  name: string;
  kind: string;
  parent_id: string | null;
  created_at: string;
}

export default function ExpenseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState<ExpenseData | null>(null);
  const [category, setCategory] = useState<CategoryData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    loadExpense();
  }, [id]);

  const loadExpense = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .single();

      if (expenseError) throw expenseError;
      if (!expenseData) throw new Error('Výdavok nebol nájdený');

      setExpense(expenseData);

      // Fetch category
      if (expenseData.category_id) {
        const { data: categoryData } = await supabase
          .from('categories')
          .select('*')
          .eq('id', expenseData.category_id)
          .single();

        if (categoryData) setCategory(categoryData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať výdavok');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Zmazať výdavok',
      'Naozaj chcete zmazať tento výdavok?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('expenses')
                .delete()
                .eq('id', id);

              if (error) throw error;

              showToast('Výdavok bol zmazaný', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Navigate to expenses list after delete
              setTimeout(() => {
                router.replace('/(tabs)/expenses');
              }, 1500);
            } catch (error) {
              showToast('Nepodarilo sa zmazať výdavok', 'error');
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
          <ActivityIndicator size="large" color="#0070f3" />
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </View>
    );
  }

  if (error || !expense) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Výdavok nebol nájdený'}</Text>
          <Button onPress={() => router.replace('/(tabs)/expenses')} variant="outline">
            Späť na výdavky
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
            <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
          </Card>

          {/* Details Card */}
          <Card>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dátum</Text>
              <Text style={styles.detailValue}>{formatDate(expense.date)}</Text>
            </View>

            {category && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Kategória</Text>
                <Badge variant="default">{category.name}</Badge>
              </View>
            )}

            {expense.merchant && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Obchodník</Text>
                <Text style={styles.detailValue}>{expense.merchant}</Text>
              </View>
            )}

            {expense.note && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Poznámka</Text>
                <Text style={styles.detailValueMultiline}>{expense.note}</Text>
              </View>
            )}
          </Card>

          {/* Audit Info Card */}
          <Card>
            <Text style={styles.sectionTitle}>Audit Trail</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vytvorené</Text>
              <Text style={styles.detailValueSmall}>
                {formatDateTime(expense.created_at)}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          onPress={() => router.push(`/(tabs)/expenses/${id}/edit`)}
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
    color: '#ef4444',
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

