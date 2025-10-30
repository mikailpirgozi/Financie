import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getCurrentHousehold } from '../../src/lib/api';
import { supabase } from '@/lib/supabase';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
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

export default function AssetsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useFocusEffect(
    useCallback(() => {
      loadAssets();
    }, [])
  );

  const loadAssets = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();

      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('household_id', household.id)
        .order('created_at', { ascending: false });

      if (assetsError) throw assetsError;
      setAssets(assetsData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať majetok');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssets();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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

  const renderAssetCard = ({ item }: { item: Asset }) => {
    const appreciation = calculateAppreciation(item);
    const appreciationColor = getAppreciationColor(appreciation);

    return (
      <Card
        style={styles.assetCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/(tabs)/assets/${item.id}`);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.assetIcon}>{ASSET_ICONS[item.kind] || '📦'}</Text>
          <Badge variant="default">{ASSET_LABELS[item.kind] || item.kind}</Badge>
        </View>

        <Text style={styles.assetName} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.valueSection}>
          <Text style={styles.currentValueLabel}>Aktuálna hodnota</Text>
          <Text style={styles.currentValue}>{formatCurrency(item.current_value)}</Text>
        </View>

        <View style={styles.appreciationRow}>
          <View style={styles.appreciationBadge}>
            <Text style={[styles.appreciationText, { color: appreciationColor }]}>
              {appreciation > 0 ? '+' : ''}
              {appreciation.toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.acquisitionValue}>
            Nákup: {formatCurrency(item.acquisition_value)}
          </Text>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Majetok</Text>
        </View>
        <View style={styles.content}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error} onRetry={loadAssets} />
      </View>
    );
  }

  const totalValue = assets.reduce((sum, a) => sum + a.current_value, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Majetok</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/(tabs)/assets/new')}
          >
            <Text style={styles.addButtonText}>+ Pridať</Text>
          </TouchableOpacity>
        </View>

        {assets.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>Celková hodnota:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {assets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyText}>Zatiaľ nemáte žiadny majetok</Text>
            <Button
              onPress={() => router.push('/(tabs)/assets/new')}
              style={{ marginTop: 16 }}
            >
              Pridať prvý majetok
            </Button>
          </View>
        ) : (
          <FlatList
            data={assets}
            keyExtractor={(item) => item.id}
            renderItem={renderAssetCard}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.list}
          />
        )}
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
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f59e0b',
  },
  content: {
    flex: 1,
  },
  list: {
    padding: 16,
  },
  assetCard: {
    marginBottom: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  assetIcon: {
    fontSize: 32,
  },
  assetName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  valueSection: {
    marginBottom: 12,
  },
  currentValueLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  currentValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f59e0b',
  },
  appreciationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appreciationBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  appreciationText: {
    fontSize: 13,
    fontWeight: '600',
  },
  acquisitionValue: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

