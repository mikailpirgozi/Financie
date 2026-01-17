import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileWarning, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { setupDashboardRealtimeSubscriptions, cleanupRealtimeSubscriptions } from '../../src/lib/realtime';
import { DashboardSkeleton } from '../../src/components/DashboardSkeleton';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Toast } from '@/components/ui/Toast';
import {
  AlertsBanner,
  LoansQuickStatus,
  DocumentsQuickStatus,
  VehiclesQuickStatus,
  FinanceSummaryCollapsed,
  type AlertItem,
} from '../../src/components/dashboard';
import { useDashboardAlerts } from '../../src/hooks';
import { useTheme } from '../../src/contexts';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const { data, isLoading, error, refetch, hasData } = useDashboardAlerts();
  
  // Store values in refs to avoid infinite loops
  const refetchRef = useRef(refetch);
  const householdIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof setupDashboardRealtimeSubscriptions> | null>(null);
  
  // Update refetch ref on each render
  refetchRef.current = refetch;

  // Setup realtime subscriptions - only when householdId actually changes
  useEffect(() => {
    const newHouseholdId = data?.householdId || null;
    
    // Only setup if householdId changed
    if (newHouseholdId === householdIdRef.current) {
      return;
    }
    
    // Cleanup previous channel
    if (channelRef.current) {
      cleanupRealtimeSubscriptions(channelRef.current);
      channelRef.current = null;
    }
    
    householdIdRef.current = newHouseholdId;
    
    if (!newHouseholdId) return;

    let lastRefetch = Date.now();
    const realtimeChannel = setupDashboardRealtimeSubscriptions(newHouseholdId, () => {
      const now = Date.now();
      if (now - lastRefetch > 5000) {
        lastRefetch = now;
        refetchRef.current();
      }
    });

    channelRef.current = realtimeChannel;

    return () => {
      if (channelRef.current) {
        cleanupRealtimeSubscriptions(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [data?.householdId]);

  const handleNavigation = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(route as any);
  };

  const handleViewExpiringDocs = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/documents');
  };

  if (isLoading && !hasData) {
    return <DashboardSkeleton />;
  }

  if (error && !hasData) {
    return (
      <ErrorMessage
        message={error instanceof Error ? error.message : 'Nepodarilo sa načítať dáta'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return null;
  }

  // Build alerts array
  const expiredDocsCount = data.documents.expiredCount || 0;
  const expiringSoonCount = data.documents.expiringSoonCount || 0;
  
  const alerts: AlertItem[] = [
    {
      type: 'overdue_loans',
      count: data.loans.overdueCount,
      message: data.loans.overdueCount === 1 ? 'omeškaná splátka' : 'omeškaných splátok',
      onPress: () => handleNavigation('/(tabs)/loans'),
    },
    // Show expired documents separately (higher priority)
    {
      type: 'expired_docs',
      count: expiredDocsCount,
      message: expiredDocsCount === 1 ? 'expirovaný dokument!' : 'expirovaných dokumentov!',
      onPress: () => handleNavigation('/(tabs)/documents'),
    },
    // Show expiring soon documents
    {
      type: 'expiring_docs',
      count: expiringSoonCount,
      message: expiringSoonCount === 1 ? 'končiaci dokument' : 'končiacich dokumentov',
      onPress: () => handleNavigation('/(tabs)/documents'),
    },
    {
      type: 'unpaid_fines',
      count: data.documents.unpaidFinesCount,
      message: data.documents.unpaidFinesCount === 1 ? 'nezaplatená pokuta' : 'nezaplatených pokút',
      onPress: () => handleNavigation('/(tabs)/documents'),
    },
  ];

  const hasAnyAlerts = alerts.some((a) => a.count > 0);

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.primary,
            paddingTop: insets.top + 16,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textInverse }]}>Prehľad</Text>
          <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>
            {data.finance.month}
          </Text>
        </View>
        {!hasAnyAlerts && (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
            <Text style={[styles.statusText, { color: colors.success }]}>●</Text>
            <Text style={[styles.statusLabel, { color: colors.textInverse }]}>OK</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && hasData}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Priority Alerts */}
        <View style={styles.section}>
          <AlertsBanner alerts={alerts} />
        </View>

        {/* Loans Quick Status */}
        <View style={styles.section}>
          <LoansQuickStatus
            totalDebt={data.loans.totalDebt}
            activeCount={data.loans.activeCount}
            overdueCount={data.loans.overdueCount}
            nextPayment={data.loans.nextPayment}
            totalProgress={data.loans.totalProgress}
            onPress={() => handleNavigation('/(tabs)/loans')}
          />
        </View>

        {/* Documents Quick Status */}
        <View style={styles.section}>
          <DocumentsQuickStatus
            expiringCount={data.documents.expiringCount}
            expiredCount={data.documents.expiredCount}
            expiringSoonCount={data.documents.expiringSoonCount}
            unpaidFinesCount={data.documents.unpaidFinesCount}
            unpaidFinesTotal={data.documents.unpaidFinesTotal}
            nearestExpiring={data.documents.nearestExpiring}
            totalDocuments={data.documents.totalCount}
            onPress={() => handleNavigation('/(tabs)/documents')}
          />
        </View>

        {/* Vehicles Quick Status */}
        <View style={styles.section}>
          <VehiclesQuickStatus
            totalCount={data.vehicles.totalCount}
            totalValue={data.vehicles.totalValue}
            loanBalance={data.vehicles.loanBalance}
            expiringDocsCount={data.vehicles.expiringDocsCount}
            onPress={() => handleNavigation('/(tabs)/vehicles')}
          />
        </View>

        {/* Finance Summary (Collapsed) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Finančný prehľad
          </Text>
          <FinanceSummaryCollapsed
            netWorth={data.finance.netWorth}
            netWorthChange={data.finance.netWorthChange}
            totalIncome={data.finance.totalIncome}
            totalExpenses={data.finance.totalExpenses}
            netCashFlow={data.finance.netCashFlow}
            month={data.finance.month}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Rýchle akcie</Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleViewExpiringDocs}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconContainer, { backgroundColor: colors.warningLight }]}>
              <FileWarning size={20} color={colors.warning} />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Zobraziť končiace dokumenty</Text>
            <ChevronRight size={20} color={colors.textMuted} />
          </TouchableOpacity>
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
  wrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
