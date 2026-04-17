import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { useLinkLoanToAsset, useUnlinkLoanFromAsset } from '@/hooks/usePortfolio';
import { getCurrentHousehold } from '@/lib/api';
import * as Haptics from 'expo-haptics';

interface Asset {
  id: string;
  name: string;
  kind: string;
  current_value: number;
  acquisition_value: number;
}

interface Loan {
  id: string;
  lender: string;
  linked_asset_id: string | null;
  loan_type: string | null;
  loan_purpose: string | null;
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

export default function LinkAssetToLoanScreen() {
  const router = useRouter();
  const { id: loanId } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const linkMutation = useLinkLoanToAsset();
  const unlinkMutation = useUnlinkLoanFromAsset();

  const loadData = React.useCallback(async () => {
    if (!loanId) return;
    try {
      setLoading(true);

      // Get household
      const household = await getCurrentHousehold();

      // Load loan
      const { data: loanData, error: loanError } = await supabase
        .from('loans')
        .select('id, lender, linked_asset_id, loan_type, loan_purpose')
        .eq('id', loanId)
        .single();

      if (loanError) throw loanError;
      setLoan(loanData);

      // Load assets – when the loan is clearly a vehicle loan, only show vehicles.
      // Otherwise show all assets so user can link to real_estate, business, etc.
      const isVehicleLoan =
        loanData?.loan_purpose === 'vehicle_purchase' || loanData?.loan_type === 'auto_loan';

      let query = supabase
        .from('assets')
        .select('id, name, kind, current_value, acquisition_value')
        .eq('household_id', household.id)
        .order('name', { ascending: true });

      if (isVehicleLoan) {
        query = query.eq('kind', 'vehicle');
      }

      const { data: assetsData, error: assetsError } = await query;

      if (assetsError) throw assetsError;
      setAssets(assetsData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('Nepodarilo sa načítať dáta', 'error');
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLinkAsset = async (assetId: string) => {
    try {
      await linkMutation.mutateAsync({ loanId: loanId!, assetId });
      showToast('Úver bol prepojený s majetkom', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reload loan
      await loadData();
    } catch (error) {
      console.error('Failed to link asset:', error);
      showToast('Nepodarilo sa prepojiť majetok', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleUnlinkAsset = async () => {
    Alert.alert('Odpojiť majetok', 'Naozaj chcete odpojiť tento majetok od úveru?', [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Odpojiť',
        style: 'destructive',
        onPress: async () => {
          try {
            await unlinkMutation.mutateAsync(loanId!);
            showToast('Majetok bol odpojený', 'success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Reload loan
            await loadData();
          } catch (error) {
            console.error('Failed to unlink asset:', error);
            showToast('Nepodarilo sa odpojiť majetok', 'error');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        },
      },
    ]);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>Úver nenájdený</Text>
        </View>
      </View>
    );
  }

  const currentAsset = assets.find((a) => a.id === loan.linked_asset_id);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Current Link */}
          {currentAsset && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Aktuálne prepojený majetok</Text>
              <Card>
                <View style={styles.assetRow}>
                  <View style={styles.assetLeft}>
                    <Text style={styles.assetIcon}>{ASSET_ICONS[currentAsset.kind] || '📦'}</Text>
                    <View style={styles.assetInfo}>
                      <Text style={styles.assetName}>{currentAsset.name}</Text>
                      <Text style={styles.assetKind}>
                        {ASSET_LABELS[currentAsset.kind] || currentAsset.kind}
                      </Text>
                      <Text style={styles.assetValue}>
                        {formatCurrency(currentAsset.current_value)}
                      </Text>
                    </View>
                  </View>
                </View>

                <Button
                  onPress={handleUnlinkAsset}
                  variant="destructive"
                  fullWidth
                  disabled={unlinkMutation.isPending}
                >
                  {unlinkMutation.isPending ? 'Odpájam...' : 'Odpojiť majetok'}
                </Button>
              </Card>
            </View>
          )}

          {/* Available Assets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {currentAsset ? 'Alebo zvoľte iný majetok' : 'Zvoľte majetok na prepojenie'}
            </Text>

            {assets.length === 0 ? (
              <Card>
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🏠</Text>
                  <Text style={styles.emptyText}>
                    Nemáte žiadny majetok. Najprv vytvorte majetok.
                  </Text>
                  <Button onPress={() => router.push('/(screens)/assets/new')} variant="primary">
                    Pridať majetok
                  </Button>
                </View>
              </Card>
            ) : (
              assets
                .filter((asset) => asset.id !== loan.linked_asset_id)
                .map((asset) => (
                  <TouchableOpacity
                    key={asset.id}
                    onPress={() => handleLinkAsset(asset.id)}
                    disabled={linkMutation.isPending}
                  >
                    <Card style={styles.assetCard}>
                      <View style={styles.assetRow}>
                        <View style={styles.assetLeft}>
                          <Text style={styles.assetIcon}>{ASSET_ICONS[asset.kind] || '📦'}</Text>
                          <View style={styles.assetInfo}>
                            <Text style={styles.assetName}>{asset.name}</Text>
                            <Text style={styles.assetKind}>
                              {ASSET_LABELS[asset.kind] || asset.kind}
                            </Text>
                            <Text style={styles.assetValue}>
                              {formatCurrency(asset.current_value)}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.chevron}>›</Text>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))
            )}
          </View>
        </View>
      </ScrollView>

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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  assetCard: {
    marginBottom: 12,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  assetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assetIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  assetKind: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  assetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  chevron: {
    fontSize: 24,
    color: '#d1d5db',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
});
