import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

import { type Loan } from '../../src/lib/api';
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
  UpcomingPaymentsCalendar,
  filterAndSortLoans,
  type LoanFilters,
} from '../../src/components/loans';
import { NoteEditorModal } from '../../src/components/loans/NoteEditorModal';
import { useLoans, useHousehold } from '../../src/hooks';
import { queryKeys } from '../../src/lib/queryClient';

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
  const queryClient = useQueryClient();

  // Use React Query hooks for data fetching with caching
  const { data: household, isLoading: isHouseholdLoading } = useHousehold();
  const householdId = household?.id ?? '';

  const {
    data: loans = [],
    isLoading: isLoansLoading,
    isFetching,
    error: loansError,
    refetch,
  } = useLoans(householdId);

  const isLoading = isHouseholdLoading || (isLoansLoading && !loans.length);
  const error = loansError
    ? loansError instanceof Error
      ? loansError.message
      : 'Nepodarilo sa načítať úvery'
    : null;

  // Schedule local push reminders (D-3, D, overdue) when loans change.
  // Throttled internally by react-query's staleTime + the upstream
  // cancelAll-then-reschedule logic in scheduleLoanReminders.
  useEffect(() => {
    if (!loans.length) return;
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { scheduleLoanReminders } = require('../../src/lib/notifications');
        // Pull the next 90 days of pending schedules across all loans
        const { data: schedules, error: schedErr } = await supabase
          .from('loan_schedules')
          .select('id, loan_id, installment_no, due_date, total_due, status')
          .in(
            'loan_id',
            loans.map((l: Loan) => l.id)
          )
          .neq('status', 'paid')
          .gte('due_date', new Date().toISOString().slice(0, 10))
          .lte(
            'due_date',
            new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
          );
        if (cancelled || schedErr || !schedules) return;
        await scheduleLoanReminders(
          loans.map((l: Loan) => ({ id: l.id, name: l.name, lender: l.lender })),
          schedules
        );
      } catch (err) {
        console.warn('scheduleLoanReminders failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loans]);

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

  // Pinned notes state - lazy loaded
  const [pinnedNotes, setPinnedNotes] = useState<Record<string, LoanNote>>({});
  const [notesLoaded, setNotesLoaded] = useState(false);

  // Note editor modal state
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);

  // Load pinned notes lazily after initial render (non-blocking)
  useEffect(() => {
    if (loans.length > 0 && !notesLoaded) {
      // Delay notes loading to not block initial render
      const timer = setTimeout(() => {
        loadPinnedNotes(loans.map((l) => l.id));
        setNotesLoaded(true);
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [loans.length, notesLoaded]);

  const loadPinnedNotes = async (loanIds: string[]) => {
    if (loanIds.length === 0) return;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // BATCH: 1 HTTP request namiesto N (predtym Promise.all loanIds.map(fetch))
      const params = new URLSearchParams({
        loanIds: loanIds.join(','),
        pinnedHighOnly: 'true',
      });

      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/loans/notes?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        console.warn('Batch notes fetch failed:', response.status);
        return;
      }

      const data: { notes: Record<string, LoanNote[]> } = await response.json();
      const notesMap: Record<string, LoanNote> = {};

      for (const loanId of loanIds) {
        const first = data.notes[loanId]?.[0];
        if (first) notesMap[loanId] = first;
      }

      setPinnedNotes(notesMap);
    } catch (err) {
      console.warn('Failed to load pinned notes:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setNotesLoaded(false);
    await refetch();
  }, [refetch]);

  // Helper to parse amounts
  const parseAmount = useCallback((val: number | string | undefined): number => {
    if (val === undefined || val === null) return 0;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  }, []);

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

    const totalPrincipal = loans.reduce((sum, l) => sum + parseAmount(l.principal), 0);

    const totalOverdueCount = loans.reduce((sum, l) => sum + (l.overdue_count || 0), 0);

    const totalPaid = loans.reduce(
      (sum, l) => sum + parseAmount(l.amount_paid || l.paid_principal),
      0
    );

    const totalProgress = totalPrincipal > 0 ? (totalPaid / totalPrincipal) * 100 : 0;

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

    const totalInterest = loans.reduce((sum, l) => sum + parseAmount(l.total_interest), 0);

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
  }, [loans, parseAmount]);

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
  const dynamicFilterOptions: SegmentOption<FilterStatus>[] = useMemo(
    () => [
      { value: 'all', label: 'Všetky', count: loans.length },
      { value: 'active', label: 'Aktívne', count: stats.activeLoans.length },
      { value: 'overdue', label: 'Dlžné', count: stats.overdueLoans.length },
      { value: 'paid_off', label: 'Hotové', count: stats.paidOffLoans.length },
    ],
    [loans.length, stats.activeLoans.length, stats.overdueLoans.length, stats.paidOffLoans.length]
  );

  const handleLoanPress = useCallback(
    (loanId: string) => {
      router.push(`/(tabs)/loans/${loanId}`);
    },
    [router]
  );

  const handleLoanLongPress = useCallback((loan: Loan) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedLoan(loan);
    setActionSheetVisible(true);
  }, []);

  const handleCloseActionSheet = useCallback(() => {
    setActionSheetVisible(false);
    setSelectedLoan(null);
  }, []);

  const handleNextPaymentPress = useCallback(() => {
    if (stats.nextPayment) {
      router.push(`/(tabs)/loans/${stats.nextPayment.loanId}`);
    }
  }, [router, stats.nextPayment]);

  const handleQuickPayPress = useCallback(() => {
    if (stats.nextPayment) {
      router.push(`/(tabs)/loans/${stats.nextPayment.loanId}/pay`);
    }
  }, [router, stats.nextPayment]);

  // Action sheet handlers
  const handlePayment = useCallback(() => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/pay`);
  }, [selectedLoan, handleCloseActionSheet, router]);

  const handleAddNote = useCallback(() => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    setNoteEditorVisible(true);
  }, [selectedLoan, handleCloseActionSheet]);

  const handleViewStats = useCallback(() => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/simulate`);
  }, [selectedLoan, handleCloseActionSheet, router]);

  const handleEditLoan = useCallback(() => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/edit`);
  }, [selectedLoan, handleCloseActionSheet, router]);

  const handleLinkAsset = useCallback(() => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/link-asset`);
  }, [selectedLoan, handleCloseActionSheet, router]);

  const handleEarlyRepay = useCallback(() => {
    if (!selectedLoan) return;
    handleCloseActionSheet();
    router.push(`/(tabs)/loans/${selectedLoan.id}/early-repayment`);
  }, [selectedLoan, handleCloseActionSheet, router]);

  const handleDeleteLoan = useCallback(() => {
    if (!selectedLoan) return;
    handleCloseActionSheet();

    Alert.alert(
      'Zmazať úver',
      `Naozaj chcete zmazať úver "${selectedLoan.name || selectedLoan.lender}"?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
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
                message: 'Úver bol zmazaný',
                type: 'success',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Invalidate queries to refetch
              queryClient.invalidateQueries({ queryKey: queryKeys.loans(householdId) });
              queryClient.invalidateQueries({ queryKey: ['dashboard-alerts'] });
            } catch (err) {
              setToast({
                visible: true,
                message: 'Nepodarilo sa zmazať úver',
                type: 'error',
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  }, [selectedLoan, handleCloseActionSheet, queryClient, householdId]);

  const handleSaveNote = useCallback(
    async (noteData: {
      content: string;
      priority: 'high' | 'normal' | 'low';
      status: 'pending' | 'completed' | 'info';
      is_pinned: boolean;
    }) => {
      if (!selectedLoan) return;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

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
    },
    [selectedLoan, loans]
  );

  const handleAddLoan = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/loans/new');
  }, [router]);

  const handleLoanQuickPay = useCallback(
    (loan: Loan) => {
      router.push(`/(tabs)/loans/${loan.id}/pay`);
    },
    [router]
  );

  const handleLoanEdit = useCallback(
    (loan: Loan) => {
      router.push(`/(tabs)/loans/${loan.id}/edit`);
    },
    [router]
  );

  const renderLoanItem = useCallback(
    ({ item }: { item: Loan }) => (
      <LoanListItem
        loan={item}
        pinnedNote={pinnedNotes[item.id] || null}
        onPress={() => handleLoanPress(item.id)}
        onLongPress={() => handleLoanLongPress(item)}
        onQuickPay={handleLoanQuickPay}
        onEdit={handleLoanEdit}
      />
    ),
    [pinnedNotes, handleLoanPress, handleLoanLongPress, handleLoanQuickPay, handleLoanEdit]
  );

  const renderHeader = useCallback(
    () => (
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

        {/* Upcoming payments calendar */}
        {loans.length > 0 && stats.activeLoans.length > 0 && (
          <UpcomingPaymentsCalendar
            loans={stats.activeLoans}
            onPaymentPress={handleLoanPress}
            limit={6}
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
              ? 'úver'
              : filteredAndSortedLoans.length < 5
                ? 'úvery'
                : 'úverov'}
            {advancedFilters.search && ` pre "${advancedFilters.search}"`}
          </Text>
        )}

        {/* No results message */}
        {loans.length > 0 &&
          filteredAndSortedLoans.length === 0 &&
          (advancedFilters.search || advancedFilters.lender || advancedFilters.loanType) && (
            <View style={styles.noResults}>
              <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                Žiadne úvery nezodpovedajú filtrom
              </Text>
              <TouchableOpacity
                style={[styles.clearFiltersButton, { borderColor: colors.primary }]}
                onPress={() =>
                  setAdvancedFilters({
                    search: '',
                    lender: null,
                    loanType: null,
                    sortBy: 'next_payment',
                  })
                }
              >
                <Text style={[styles.clearFiltersText, { color: colors.primary }]}>
                  Zrušiť filtre
                </Text>
              </TouchableOpacity>
            </View>
          )}
      </View>
    ),
    [
      loans.length,
      stats,
      dynamicFilterOptions,
      filterStatus,
      filteredAndSortedLoans.length,
      advancedFilters,
      colors,
      handleNextPaymentPress,
      handleQuickPayPress,
      handleLoanPress,
    ]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.primaryLight }]}>
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
              Pridať prvý úver
            </Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [filterStatus, colors, handleAddLoan]
  );

  const handleCloseNoteEditor = useCallback(() => {
    setNoteEditorVisible(false);
    setSelectedLoan(null);
  }, []);

  const handleDismissToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.surface }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>Úvery</Text>
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
        <ErrorMessage message={error} onRetry={() => refetch()} />
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
        <Text style={[styles.title, { color: colors.text }]}>Úvery</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleAddLoan}
        >
          <Plus size={20} color={colors.textInverse} />
          <Text style={[styles.addButtonText, { color: colors.textInverse }]}>Pridat</Text>
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
            refreshing={isFetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredAndSortedLoans.length === 0 &&
            !(advancedFilters.search || advancedFilters.lender || advancedFilters.loanType) &&
            styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={8}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={handleDismissToast}
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
        onClose={handleCloseNoteEditor}
        title={`Poznámka k úveru ${selectedLoan?.name || selectedLoan?.lender || ''}`}
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
