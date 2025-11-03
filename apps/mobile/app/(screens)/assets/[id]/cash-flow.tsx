import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

interface Asset {
  id: string;
  name: string;
  is_income_generating: boolean | null;
  monthly_income: number | null;
  monthly_expenses: number | null;
  asset_status: string | null;
}

const ASSET_STATUS_OPTIONS = [
  { value: 'owned', label: 'Vlastnené' },
  { value: 'rented_out', label: 'Prenajatý' },
  { value: 'for_sale', label: 'Na predaj' },
  { value: 'sold', label: 'Predaný' },
];

export default function AssetCashFlowScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);
  
  // Form state
  const [isIncomeGenerating, setIsIncomeGenerating] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');
  const [assetStatus, setAssetStatus] = useState('owned');
  
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    loadAsset();
  }, [id]);

  const loadAsset = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('assets')
        .select('id, name, is_income_generating, monthly_income, monthly_expenses, asset_status')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Majetok nebol nájdený');

      setAsset(data);
      setIsIncomeGenerating(data.is_income_generating || false);
      setMonthlyIncome(data.monthly_income?.toString() || '');
      setMonthlyExpenses(data.monthly_expenses?.toString() || '');
      setAssetStatus(data.asset_status || 'owned');
    } catch (error) {
      console.error('Failed to load asset:', error);
      showToast('Nepodarilo sa načítať majetok', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updates = {
        is_income_generating: isIncomeGenerating,
        monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : 0,
        monthly_expenses: monthlyExpenses ? parseFloat(monthlyExpenses) : 0,
        asset_status: assetStatus,
      };

      const { error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      showToast('Nastavenia boli uložené', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('Failed to save:', error);
      showToast('Nepodarilo sa uložiť nastavenia', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const formatCurrency = (value: string) => {
    const num = parseFloat(value || '0');
    if (isNaN(num)) return '0 €';
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const netCashFlow = (parseFloat(monthlyIncome || '0') - parseFloat(monthlyExpenses || '0'));

  if (loading || !asset) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Cash Flow nastavenia</Text>
            <Text style={styles.subtitle}>{asset.name}</Text>
          </View>

          {/* Income Generating Toggle */}
          <Card style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <Text style={styles.switchLabel}>Produktívny majetok</Text>
                <Text style={styles.switchDescription}>
                  Generuje pravidelný príjem (nájom, dividendy, úroky)
                </Text>
              </View>
              <Switch
                value={isIncomeGenerating}
                onValueChange={setIsIncomeGenerating}
                trackColor={{ false: '#d1d5db', true: '#a78bfa' }}
                thumbColor={isIncomeGenerating ? '#8b5cf6' : '#f3f4f6'}
              />
            </View>
          </Card>

          {/* Income & Expenses */}
          {isIncomeGenerating && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Mesačný cash flow</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mesačný príjem</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={monthlyIncome}
                    onChangeText={setMonthlyIncome}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.inputSuffix}>€</Text>
                </View>
                <Text style={styles.inputHint}>
                  Nájomné, dividendy, úroky, príjmy z prevádzky
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mesačné náklady</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={monthlyExpenses}
                    onChangeText={setMonthlyExpenses}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.inputSuffix}>€</Text>
                </View>
                <Text style={styles.inputHint}>
                  Dane, údržba, poistenie, energie, správa
                </Text>
              </View>

              {/* Net Cash Flow Summary */}
              <View style={[styles.summaryBox, netCashFlow >= 0 ? styles.summaryPositive : styles.summaryNegative]}>
                <Text style={styles.summaryLabel}>Čistý mesačný príjem</Text>
                <Text style={[styles.summaryValue, netCashFlow >= 0 ? styles.valuePositive : styles.valueNegative]}>
                  {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow.toString())}
                </Text>
              </View>
            </Card>
          )}

          {/* Asset Status */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Status majetku</Text>
            
            <View style={styles.radioGroup}>
              {ASSET_STATUS_OPTIONS.map((option) => (
                <View
                  key={option.value}
                  style={styles.radioButton}
                  onTouchEnd={() => setAssetStatus(option.value)}
                >
                  <View style={styles.radioCircle}>
                    {assetStatus === option.value && <View style={styles.radioCircleInner} />}
                  </View>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          onPress={handleSave}
          variant="primary"
          fullWidth
          disabled={saving}
        >
          {saving ? 'Ukladám...' : 'Uložiť nastavenia'}
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
    fontSize: 14,
    color: '#6b7280',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLeft: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
  },
  inputSuffix: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  summaryBox: {
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  summaryPositive: {
    backgroundColor: '#d1fae5',
  },
  summaryNegative: {
    backgroundColor: '#fee2e2',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  valuePositive: {
    color: '#059669',
  },
  valueNegative: {
    color: '#dc2626',
  },
  radioGroup: {
    gap: 12,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8b5cf6',
  },
  radioLabel: {
    fontSize: 16,
    color: '#111827',
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

