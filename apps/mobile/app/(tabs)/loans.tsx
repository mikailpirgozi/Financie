import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { getLoans, getCurrentHousehold, type Loan } from '../../src/lib/api';
import { supabase } from '../../src/lib/supabase';
import { env } from '../../src/lib/env';
import { useTheme } from '../../src/contexts';
import { ErrorMessage } from '../../src/components/ErrorMessage';
import { Toast } from '@/components/ui/Toast';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { SegmentControl, SegmentOption } from '@/components/ui/SegmentControl';
import {
  LoanHeroCard,
  LoanListItem,
  LoanActionSheet,
  LoanSearchFilter,
  filterAndSortLoans,
  type LoanFilters,
} from '../../src/components/loans';
import { NoteEditorModal } from '../../src/components/loans/NoteEditorModal';

interface LoanNote {
  id: string;
  loan_id: string;
  content: string;
  priority: 'high' | 'normal' | 'low';
  is_pinned: boolean;
}

type FilterStatus = 'all' | 'active' | 'overdue' | 'paid_off';

export default function LoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<LoanFilters>({
    search: '',
    lender: null,
    loanType: null,
    sortBy: 'next_payment',
  });

  // Action sheet state
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Pinned notes state
  const [pinnedNotes, setPinnedNotes] = useState<Record<string, LoanNote>>({});

  // Note editor modal state
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadLoans();
    }, [])
  );

  const loadLoans = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const loansData = await getLoans(household.id);
      setLoans(loansData);

      // Load pinned notes for all loans
      await loadPinnedNotes(loansData.map((l) => l.id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Nepodarilo sa nacitat uvery'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadPinnedNotes = async (loanIds: string[]) => {
    if (loanIds.length === 0) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch pinned high-priority notes for all loans
      const notesMap: Record<string, LoanNote> = {};

      await Promise.all(
        loanIds.map(async (loanId) => {
          try {
            const response = await fetch(
              `${env.EXPO_PUBLIC_API_URL}/api/loans/${loanId}/notes`,
              {
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
              }
            );

            if (response.ok) {
              const data = await response.json();
              // Find the first pinned high-priority note
              const pinnedNote = (data.notes || []).find(
                (note: LoanNote) =>
                  note.is_pinned && note.priority === 'high'
              );
              if (pinnedNote) {
                notesMap[loanId] = pinnedNote;
              }
            }
          } catch (err) {
            console.warn(`Failed to load notes for loan ${loanId}:`, err);
          }
        })
      );

      setPinnedNotes(notesMap);
    } catch (err) {
      console.warn('Failed to load pinned notes:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLoans();
    setRefreshing(false);
  };

  // Helper to parse amounts
  const parseAmount = (val: number | string | undefined): number => {
    if (val === undefined || val === null) return 0;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  };

  // Calculate stats with new metrics
  const stats = useMemo(() => {
    const activeLoans = loans.filter((l) => l.status === 'active');
    const paidOffLoans = loans.filter((l) => l.status === 'paid_off');
    // Loans with at least one overdue installment
    const overdueLoans = loans.filter((l) => l.status === 'active' && (l.overdue_count || 0) > 0);

    const totalRemaining = activeLoans.reduce(
      (sum, l) => sum + parseAmount(l.remaining_balance),
      0
    );

    const totalPrincipal = loans.reduce(
      (sum, l) => sum + parseAmount(l.principal),
      0
    );

    const totalOverdueCount = loans.reduce(
      (sum, l) => sum + (l.overdue_count || 0),
      0
    );

    const totalPaid = loans.reduce(
      (sum, l) => sum + parseAmount(l.amount_paid || l.paid_principal),
      0
    );

    const totalProgress =
      totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;

    // Calculate total monthly payment from active loans
    const totalMonthlyPayment = activeLoans.reduce(
      (sum, l) => sum + parseAmount(l.monthly_payment),
      0
    );

    // Calculate interest metrics
    const totalInterestPaid = loans.reduce((sum, l) => {
      // Estimate paid interest from schedule if available
      const paidAmount = parseAmount(l.paid_amount || l.amount_paid);
      const paidPrincipal = parseAmount(l.paid_principal);
      return sum + (paidAmount - paidPrincipal);
    }, 0);

    const totalInterest = loans.reduce(
      (sum, l) => sum + parseAmount(l.total_interest),
      0
    );

    const totalInterestRemaining = totalInterest - totalInterestPaid;

    // Find next payment across all loans
    type NextPaymentType = {
      date: string;
      amount: number;
      lender: string;
      loanName?: string;
      daysUntil: number;
      loanId: string;
    };
    
    let nextPayment: NextPaymentType | null = null;

    for (const loan of activeLoans) {
      if (loan.next_installment) {
        const ni = loan.next_installment;
        if (!nextPayment || ni.days_until < nextPayment.daysUntil) {
          nextPayment = {
            date: ni.due_date,
            amount: parseAmount(ni.total_due),
            lender: loan.lender,
            loanName: loan.name,
            daysUntil: ni.days_until,
            loanId: loan.id,
          };
        }
      }
    }

    return {
      activeLoans,
      paidOffLoans,
      overdueLoans,
      totalRemaining,
      totalPrincipal,
      totalOverdueCount,
      totalPaid,
      totalProgress,
      totalMonthlyPayment,
      totalInterestPaid: Math.max(0, totalInterestPaid),
      totalInterestRemaining: Math.max(0, totalInterestRemaining),
      nextPayment,
    };
  }, [loans]);

  // Filter loans by status first
  const statusFilteredLoans = useMemo(() => {
    if (filterStatus === 'all') return loans;
    if (filterStatus === 'overdue') {
      // Filter active loans with overdue installments
      return loans.filter((loan) => loan.status === 'active' && (loan.overdue_count || 0) > 0);
    }
    return loans.filter((loan) => loan.status === filterStatus);
  }, [loans, filterStatus]);

  // Apply advanced filters and sorting
  const filteredAndSortedLoans = useMemo(() => {
    return filterAndSortLoans(statusFilteredLoans, advancedFilters);
  }, [statusFilteredLoans, advancedFilters]);

  // Update filter options with counts
  const dynamicFilterOptions: SegmentOption<FilterStatus>[] = [
    { value: 'all', label: 'Všetky', count: loans.length },
    { value: 'active', label: 'Aktívne', count: stats.activeLoans.length },
    { value: 'overdue', label: 'Dlžné', count: stats.overdueLoans.length },
    { value: 'paid_off', label: 'Hotové', count: stats.paidOffLoans.length },
  ];

  const handleLoanPress = (loanId: string) => {
    router.push(`/(tabs)/loans/${loanId}`);
  };

  const handleLoanLongPress = (loan: Loan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedLoan(loan);
    setActionSheetVisible(true);
  };

  const handleCloseActionSheet = () => {
    setActionSheetVisible(false);
    setSelectedLoan(null);
  };

  const handleNextPaymentPress = () => {
    if (stats.nextPayment) {
      router.push(`/(tabs)/loans/${stats.nextPayment.loanId}`);
    }
  };

  const handleQuickPayPress = () => {
    if (stats.nextPayment) {
      router.push(`/(tabs)/loans/${stats.nextPayment.loanId}/pay`);
    }
  };

  // Action sheet handlers
  const handlePayment = () => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/pay`);
  };

  const handleAddNote = () => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    setNoteEditorVisible(true);
  };

  const handleViewStats = () => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/simulate`);
  };

  const handleEditLoan = () => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/edit`);
  };

  const handleLinkAsset = () => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/link-asset`);
  };

  const handleEarlyRepay = () => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/early-repayment`);
  };

  const handleDeleteLoan = () => {
    if (!selectedLoan) return;
    handleCloseActionSheet();

    Alert.alert(
      'Zmazat uver',
      `Naozaj chcete zmazat uver "${selectedLoan.name || selectedLoan.lender}"?`,
      [
        { text: 'Zrusit', style: 'cancel' },
        {
          text: 'Zmazat',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error: deleteError } = await supabase
                .from('loans')
                .delete()
                .eq('id', selectedLoan.id);

              if (deleteError) throw deleteError;

              setToast({
                visible: true,
                message: 'Uver bol zmazany',
                type: 'success',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await loadLoans();
            } catch (err) {
              setToast({
                visible: true,
                message: 'Nepodarilo sa zmazat uver',
                type: 'error',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  const handleSaveNote = async (noteData: {
    content: string;
    priority: 'high' | 'normal' | 'low';
    status: 'pending' | 'completed' | 'info';
    is_pinned: boolean;
  }) => {
    if (!selectedLoan) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/loans/${selectedLoan.id}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(noteData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      setNoteEditorVisible(false);
      setSelectedLoan(null);
      setToast({
        visible: true,
        message: 'Poznamka bola pridana',
        type: 'success',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reload pinned notes
      await loadPinnedNotes(loans.map((l) => l.id));
    } catch (err) {
      setToast({
        visible: true,
        message: 'Nepodarilo sa ulozit poznamku',
        type: 'error',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleAddLoan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/loans/new');
  };

  const renderLoanItem = ({ item }: { item: Loan }) => (
    <LoanListItem
      loan={item}
      pinnedNote={pinnedNotes[item.id] || null}
      onPress={() => handleLoanPress(item.id)}
      onLongPress={() => handleLoanLongPress(item)}
    />
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {/* Hero Card */}
      {loans.length > 0 && (
        <LoanHeroCard
          totalBalance={stats.totalRemaining}
          totalPrincipal={stats.totalPrincipal}
          activeCount={stats.activeLoans.length}
          overdueCount={stats.totalOverdueCount}
          paidOffCount={stats.paidOffLoans.length}
          totalProgress={stats.totalProgress}
          totalMonthlyPayment={stats.totalMonthlyPayment}
          totalInterestPaid={stats.totalInterestPaid}
          totalInterestRemaining={stats.totalInterestRemaining}
          nextPayment={stats.nextPayment}
          onNextPaymentPress={handleNextPaymentPress}
          onQuickPayPress={handleQuickPayPress}
        />
      )}

      {/* Filter Segment */}
      {loans.length > 0 && (
        <View style={styles.filterSection}>
          <SegmentControl
            options={dynamicFilterOptions}
            value={filterStatus}
            onChange={setFilterStatus}
            size="md"
          />
        </View>
      )}

      {/* Results count */}
      {loans.length > 0 && filteredAndSortedLoans.length > 0 && (
        <Text style={[styles.resultsCount, { color: colors.textMuted }]}>
          {filteredAndSortedLoans.length}{' '}
          {filteredAndSortedLoans.length === 1
            ? 'uver'
            : filteredAndSortedLoans.length < 5
            ? 'uvery'
            : 'uverov'}
          {advancedFilters.search && ` pre "${advancedFilters.search}"`}
        </Text>
      )}

      {/* No results message */}
      {loans.length > 0 && filteredAndSortedLoans.length === 0 && (advancedFilters.search || advancedFilters.lender || advancedFilters.loanType) && (
        <View style={styles.noResults}>
          <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
            Ziadne uvery nezodpovedaju filtrom
          </Text>
          <TouchableOpacity
            style={[styles.clearFiltersButton, { borderColor: colors.primary }]}
            onPress={() => setAdvancedFilters({
              search: '',
              lender: null,
              loanType: null,
              sortBy: 'next_payment',
            })}
          >
            <Text style={[styles.clearFiltersText, { color: colors.primary }]}>
              Zrusit filtre
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View
        style={[styles.emptyIconContainer, { backgroundColor: colors.primaryLight }]}
      >
        <Text style={styles.emptyIcon}>💰</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {filterStatus === 'paid_off'
          ? 'Žiadne hotové úvery'
          : filterStatus === 'active'
          ? 'Žiadne aktívne úvery'
          : filterStatus === 'overdue'
          ? 'Žiadne dlžné úvery'
          : 'Zatiaľ nemáte žiadne úvery'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {filterStatus === 'paid_off'
          ? 'Doplatené úvery sa zobrazia tu'
          : filterStatus === 'active'
          ? 'Aktívne úvery sa zobrazia tu'
          : filterStatus === 'overdue'
          ? 'Skvelé! Všetky splátky sú uhradené včas'
          : 'Pridajte svoj prvý úver a začnite sledovať splátky'}
      </Text>
      {filterStatus === 'all' && (
        <TouchableOpacity
          style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          onPress={handleAddLoan}
        >
          <Plus size={20} color={colors.textInverse} />
          <Text style={[styles.emptyButtonText, { color: colors.textInverse }]}>
            Pridat prvy uver
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Uvery</Text>
        </View>
        <View style={styles.content}>
          <View style={{ padding: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorMessage message={error} onRetry={loadLoans} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Uvery</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddLoan}
        >
          <Plus size={20} color={colors.textInverse} />
          <Text style={[styles.addButtonText, { color: colors.textInverse }]}>
            Pridat
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Filter - Outside FlatList to prevent focus loss */}
      {loans.length > 0 && (
        <View style={[styles.searchSection, { backgroundColor: colors.background }]}>
          <LoanSearchFilter
            loans={statusFilteredLoans}
            filters={advancedFilters}
            onFiltersChange={setAdvancedFilters}
          />
        </View>
      )}

      {/* Content */}
      <FlatList
        data={filteredAndSortedLoans}
        keyExtractor={(item) => item.id}
        renderItem={renderLoanItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          advancedFilters.search || advancedFilters.lender || advancedFilters.loanType
            ? null
            : renderEmpty
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredAndSortedLoans.length === 0 && !(advancedFilters.search || advancedFilters.lender || advancedFilters.loanType) && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />

      {/* Action Sheet */}
      <LoanActionSheet
        visible={actionSheetVisible}
        loanName={selectedLoan?.name || selectedLoan?.lender || ''}
        loanLender={selectedLoan?.name ? selectedLoan?.lender : undefined}
        onPayment={handlePayment}
        onAddNote={handleAddNote}
        onViewStats={handleViewStats}
        onEdit={handleEditLoan}
        onLinkAsset={handleLinkAsset}
        onEarlyRepay={handleEarlyRepay}
        onDelete={handleDeleteLoan}
        onClose={handleCloseActionSheet}
      />

      {/* Note Editor Modal */}
      <NoteEditorModal
        visible={noteEditorVisible}
        onSave={handleSaveNote}
        onClose={() => {
          setNoteEditorVisible(false);
          setSelectedLoan(null);
        }}
        title={`Poznamka k uveru ${selectedLoan?.name || selectedLoan?.lender || ''}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: 16,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterSection: {
    marginTop: 12,
  },
  resultsCount: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '500',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noResultsText: {
    fontSize: 14,
    marginBottom: 12,
  },
  clearFiltersButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
