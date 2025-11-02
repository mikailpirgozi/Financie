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

interface Asset {
  id: string;
  household_id: string;
  kind: string;
  name: string;
  acquisition_value: number;
  current_value: number;
  acquisition_date: string;
  indexing_rule_annual_pct: number | null;
  created_at: string;
}

const ASSET_ICONS: Record<string, string> = {
  real_estate: '🏠',
  vehicle: '🚗',
  business: '💼',
  loan_receivable: '💰',
  other: '📦',
};

const ASSET_LABELS: Record<string, string> = {
  real_estate: 'Nehnuteľnosť',
  vehicle: 'Vozidlo',
  business: 'Podnik',
  loan_receivable: 'Pohľadávka',
  other: 'Ostatné',
};

export default function AssetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);

      const { data: assetData, error: assetError } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (assetError) throw assetError;
      if (!assetData) throw new Error('Majetok nebol nájdený');

      setAsset(assetData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať majetok');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Zmazať majetok',
      'Naozaj chcete zmazať tento majetok?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('assets')
                .delete()
                .eq('id', id);

              if (error) throw error;

              showToast('Majetok bol zmazaný', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              setTimeout(() => {
                router.back();
              }, 1500);
            } catch (error) {
              showToast('Nepodarilo sa zmazať majetok', 'error');
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

  const calculateAppreciation = (asset: Asset): number => {
    if (asset.acquisition_value === 0) return 0;
    return ((asset.current_value - asset.acquisition_value) / asset.acquisition_value) * 100;
  };

  const getAppreciationColor = (appreciation: number): string => {
    if (appreciation > 0) return '#10b981';
    if (appreciation < 0) return '#ef4444';
    return '#6b7280';
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

  if (error || !asset) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Majetok nebol nájdený'}</Text>
          <Button onPress={() => router.back()} variant="outline">
            Späť
          </Button>
        </View>
      </View>
    );
  }

  const appreciation = calculateAppreciation(asset);
  const appreciationColor = getAppreciationColor(appreciation);
  const appreciationAmount = asset.current_value - asset.acquisition_value;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Overview Card */}
          <Card style={styles.overviewCard}>
            <View style={styles.header}>
              <Text style={styles.icon}>{ASSET_ICONS[asset.kind] || '📦'}</Text>
              <Badge variant="default">{ASSET_LABELS[asset.kind] || asset.kind}</Badge>
            </View>

            <Text style={styles.name}>{asset.name}</Text>

            <View style={styles.valueSection}>
              <Text style={styles.valueLabel}>Aktuálna hodnota</Text>
              <Text style={styles.currentValue}>{formatCurrency(asset.current_value)}</Text>

              <View style={styles.appreciationRow}>
                <Text style={[styles.appreciationText, { color: appreciationColor }]}>
                  {appreciation > 0 ? '+' : ''}
                  {appreciation.toFixed(1)}% ({appreciation > 0 ? '+' : ''}
                  {formatCurrency(appreciationAmount)})
                </Text>
              </View>
            </View>
          </Card>

          {/* Details Card */}
          <Card>
            <Text style={styles.sectionTitle}>Detaily</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Obstarávacia hodnota</Text>
              <Text style={styles.detailValue}>{formatCurrency(asset.acquisition_value)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dátum obstarania</Text>
              <Text style={styles.detailValue}>{formatDate(asset.acquisition_date)}</Text>
            </View>

            {asset.indexing_rule_annual_pct !== null && asset.indexing_rule_annual_pct > 0 && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Ročné zhodnotenie</Text>
                <Text style={styles.detailValue}>{asset.indexing_rule_annual_pct}%</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Vytvorené</Text>
              <Text style={styles.detailValue}>{formatDate(asset.created_at)}</Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          onPress={() => router.push(`/(screens)/assets/${id}/revalue`)}
          variant="primary"
          fullWidth
        >
          Preceniť majetok
        </Button>
        <View style={styles.actionRow}>
          <Button
            onPress={() => router.push(`/(screens)/assets/${id}/edit`)}
            variant="outline"
            style={{ flex: 1, marginRight: 8 }}
          >
            Upraviť
          </Button>
          <Button
            onPress={handleDelete}
            variant="destructive"
            style={{ flex: 1 }}
          >
            Zmazať
          </Button>
        </View>
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
    paddingBottom: 180,
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
  overviewCard: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  valueSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  valueLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  currentValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 8,
  },
  appreciationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appreciationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
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
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
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
  actionRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
});

