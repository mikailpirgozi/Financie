import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Plus,
  StickyNote,
  AlertTriangle,
  CheckCircle,
  FileText,
  Upload,
  PieChart,
  Target,
  Info,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  type Loan,
  type LoanSchedule,
  type LoanDocument,
  getLoanDocuments,
  createLoanDocument,
  deleteLoanDocument,
} from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import {
  SwipeableInstallmentCard,
  LoanFinancialOverview,
  LoanMilestones,
  NoteCard,
  NoteEditorModal,
  type LoanNote,
  CompactHeroCard,
  NextPaymentCard,
  LoanDetailTabs,
  type LoanDetailTab,
  CollapsibleSection,
} from '@/components/loans';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { OptionsMenu, type MenuItem } from '@/components/ui/OptionsMenu';
import { DocumentListItem } from '@/components/common';
import { useTheme } from '../../../../src/contexts';
import { useLoan, useMarkInstallmentPaid, useMarkPaidUntilToday } from '../../../../src/hooks';
import { getCurrentHousehold } from '@/lib/api';
import { LOAN_DOCUMENT_TYPE_LABELS, type LoanDocumentType } from '@finapp/core';
import * as Haptics from 'expo-haptics';

// Extend LoanSchedule with computed overdue status
type LoanScheduleEntry = LoanSchedule & {
  status: 'pending' | 'paid' | 'overdue';
};

export default function LoanDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const colors = theme.colors;

  // Tab state
  const [activeTab, setActiveTab] = useState<LoanDetailTab>('overview');

  // React Query hooks for data fetching and mutations
  const { data: loanData, isLoading: loading, error: queryError, refetch } = useLoan(id!);
  const markInstallmentPaidMutation = useMarkInstallmentPaid();
  const markPaidUntilTodayMutation = useMarkPaidUntilToday();

  // Derive loan and schedule from query data
  const loan = loanData?.loan || null;

  // Process schedule to mark overdue entries
  const schedule: LoanScheduleEntry[] = useMemo(() => {
    const rawSchedule = loanData?.schedule;
    if (!rawSchedule || rawSchedule.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rawSchedule.map((entry) => {
      if (entry.status === 'paid') return entry as LoanScheduleEntry;
      const dueDate = new Date(entry.due_date);
      dueDate.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        return { ...entry, status: 'overdue' as const } as LoanScheduleEntry;
      }
      return entry as LoanScheduleEntry;
    });
  }, [loanData?.schedule]);

  // Local state for optimistic updates and UI
  const [optimisticSchedule, setOptimisticSchedule] = useState<LoanScheduleEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Schedule filter state (for Schedule tab) - default to 'unpaid' (overdue + pending)
  const [scheduleFilter, setScheduleFilter] = useState<'unpaid' | 'overdue' | 'all'>('unpaid');
  const [showPaidHistory, setShowPaidHistory] = useState(false);

  // Track previous schedule signature to avoid unnecessary updates
  const prevScheduleSignatureRef = useRef<string>('');

  // Sync optimistic schedule with actual schedule when data changes
  useEffect(() => {
    const scheduleSignature = schedule
      .map((entry) => `${entry.id}:${entry.status}`)
      .join(',');

    if (scheduleSignature !== prevScheduleSignatureRef.current) {
      prevScheduleSignatureRef.current = scheduleSignature;
      setOptimisticSchedule(schedule);
    }
  }, [schedule]);

  // Convert query error to string
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Nepodarilo sa načítať úver') : null;

  // Notes state
  const [notes, setNotes] = useState<LoanNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<LoanNote | null>(null);

  // Documents state
  const [documents, setDocuments] = useState<LoanDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  // Load household on mount
  useEffect(() => {
    getCurrentHousehold().then((h) => setHouseholdId(h.id)).catch(console.error);
  }, []);

  // Load notes and documents when id changes
  useEffect(() => {
    if (id) {
      loadNotes();
      loadDocuments();
    }
  }, [id]);

  // Load notes for the loan
  const loadNotes = useCallback(async () => {
    if (!id) return;

    setNotesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/notes`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setNotesLoading(false);
    }
  }, [id]);

  // Load documents for the loan
  const loadDocuments = useCallback(async () => {
    if (!id) return;

    setDocumentsLoading(true);
    try {
      const response = await getLoanDocuments(id);
      setDocuments(response.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setDocumentsLoading(false);
    }
  }, [id]);

  // Handle document upload
  const handleUploadDocument = async (docType: LoanDocumentType) => {
    if (!householdId || !id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setIsUploadingDoc(true);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'application/pdf',
        name: file.name,
      } as unknown as Blob);
      formData.append('householdId', householdId);
      formData.append('folder', 'loans');
      formData.append('recordId', id);

      const { data: { session } } = await supabase.auth.getSession();

      const uploadResponse = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/files/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadData = await uploadResponse.json();

      await createLoanDocument(id, {
        document_type: docType,
        name: file.name,
        file_path: uploadData.data.path,
        file_size: file.size,
        mime_type: file.mimeType,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Dokument bol nahraný', 'success');
      loadDocuments();
    } catch (uploadError) {
      console.error('Upload error:', uploadError);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Nepodarilo sa nahrať dokument', 'error');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Handle document delete
  const handleDeleteDocument = async (docId: string) => {
    if (!id) return;

    try {
      await deleteLoanDocument(id, docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Dokument bol zmazaný', 'success');
    } catch (err) {
      console.error('Failed to delete document:', err);
      showToast('Nepodarilo sa zmazať dokument', 'error');
    }
  };

  // Handle note save (create or update)
  const handleSaveNote = async (noteData: {
    content: string;
    priority: 'high' | 'normal' | 'low';
    status: 'pending' | 'completed' | 'info';
    is_pinned: boolean;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const url = editingNote
        ? `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/notes/${editingNote.id}`
        : `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/notes`;

      const method = editingNote ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(noteData),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      setNoteEditorVisible(false);
      setEditingNote(null);
      await loadNotes();

      showToast(
        editingNote ? 'Poznámka bola upravená' : 'Poznámka bola pridaná',
        'success'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Failed to save note:', err);
      showToast('Nepodarilo sa uložiť poznámku', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Handle note status toggle
  const handleToggleNoteStatus = async (noteId: string, newStatus: 'pending' | 'completed') => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/notes/${noteId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, status: newStatus } : n))
      );
    } catch (err) {
      console.error('Failed to toggle note status:', err);
      showToast('Nepodarilo sa aktualizovať poznámku', 'error');
    }
  };

  // Handle note pin toggle
  const handleToggleNotePin = async (noteId: string, isPinned: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/notes/${noteId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ is_pinned: isPinned }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      await loadNotes();
    } catch (err) {
      console.error('Failed to toggle note pin:', err);
      showToast('Nepodarilo sa aktualizovať poznámku', 'error');
    }
  };

  // Handle note delete
  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      'Zmazať poznámku',
      'Naozaj chcete zmazať túto poznámku?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();

              const response = await fetch(
                `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/notes/${noteId}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                  },
                }
              );

              if (!response.ok) {
                throw new Error('Failed to delete note');
              }

              setNotes((prev) => prev.filter((n) => n.id !== noteId));
              showToast('Poznámka bola zmazaná', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              console.error('Failed to delete note:', err);
              showToast('Nepodarilo sa zmazať poznámku', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  // Handle edit note
  const handleEditNote = (note: LoanNote) => {
    setEditingNote(note);
    setNoteEditorVisible(true);
  };

  // Handle add note
  const handleAddNote = () => {
    setEditingNote(null);
    setNoteEditorVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle marking single installment as paid
  const handleMarkInstallmentPaid = async (installmentId: string) => {
    setOptimisticSchedule((prev) =>
      prev.map((entry) =>
        entry.id === installmentId
          ? { ...entry, status: 'paid', paid_at: new Date().toISOString() }
          : entry
      )
    );

    markInstallmentPaidMutation.mutate(
      { loanId: id!, installmentId },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast('Splátka označená ako uhradená', 'success');
        },
        onError: () => {
          setOptimisticSchedule(schedule);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast('Nepodarilo sa označiť splátku', 'error');
        },
      }
    );
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Handle marking all installments until today as paid
  const handleMarkAllUntilToday = async () => {
    const today = new Date().toISOString().split('T')[0];

    const pendingCount = schedule.filter(
      (entry) =>
        (entry.status === 'pending' || entry.status === 'overdue') &&
        entry.due_date <= today
    ).length;

    if (pendingCount === 0) {
      Alert.alert('Info', 'Žiadne splátky na označenie');
      return;
    }

    Alert.alert(
      'Potvrdiť úhradu',
      `Naozaj chcete označiť ${pendingCount} ${pendingCount === 1 ? 'splátku' : 'splátok'} ako ${pendingCount === 1 ? 'uhradenú' : 'uhradené'}?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Potvrdiť',
          onPress: () => {
            markPaidUntilTodayMutation.mutate(
              { loanId: id!, date: today },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  showToast(`${pendingCount} ${pendingCount === 1 ? 'splátka označená' : 'splátok označených'}!`, 'success');
                },
                onError: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  showToast('Nepodarilo sa označiť splátky', 'error');
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Zmazať úver',
      'Naozaj chcete zmazať tento úver?',
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
                .eq('id', id);

              if (deleteError) throw deleteError;

              showToast('Úver bol zmazaný', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              // Navigate to loans list explicitly after delete
              setTimeout(() => {
                router.replace('/(tabs)/loans');
              }, 1500);
            } catch {
              showToast('Nepodarilo sa zmazať úver', 'error');
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

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '0,00 €';
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const calculateProgress = (loanItem: Loan): number => {
    const principal = typeof loanItem.principal === 'string' ? parseFloat(loanItem.principal) : loanItem.principal;
    const amountPaid = typeof loanItem.amount_paid === 'string' ? parseFloat(loanItem.amount_paid) : loanItem.amount_paid;
    if (principal === 0 || isNaN(principal) || isNaN(amountPaid)) return 0;
    return (amountPaid / principal) * 100;
  };

  // Calculate total interest from schedule
  const calculateTotalInterest = (): number => {
    if (!schedule || schedule.length === 0) return 0;
    return schedule.reduce((sum, entry) => {
      return sum + (parseFloat(entry.interest_due) || 0);
    }, 0);
  };

  // Calculate paid interest from paid installments
  const calculatePaidInterest = (): number => {
    if (!schedule || schedule.length === 0) return 0;
    return schedule
      .filter((entry) => entry.status === 'paid')
      .reduce((sum, entry) => {
        return sum + (parseFloat(entry.interest_due) || 0);
      }, 0);
  };

  // Calculate end date from schedule or term
  const calculateEndDate = (): string => {
    if (loan?.end_date) return loan.end_date;
    if (!schedule || schedule.length === 0) {
      if (loan?.start_date && loan?.term) {
        const startDate = new Date(loan.start_date);
        startDate.setMonth(startDate.getMonth() + loan.term);
        return startDate.toISOString().split('T')[0] || '';
      }
      return new Date().toISOString().split('T')[0] || '';
    }
    const lastEntry = schedule[schedule.length - 1];
    return lastEntry?.due_date || new Date().toISOString().split('T')[0] || '';
  };

  // Calculate days until due
  const calculateDaysUntil = (dueDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dueDateStr);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Načítavam...</Text>
        </View>
      </View>
    );
  }

  if (error || !loan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error || 'Úver nebol nájdený'}</Text>
          <Button onPress={() => router.replace('/(tabs)/loans')} variant="outline">
            Späť na úvery
          </Button>
        </View>
      </View>
    );
  }

  const progress = calculateProgress(loan);
  const paidInstallments = optimisticSchedule.filter((i) => i.status === 'paid').length;
  const totalInstallments = optimisticSchedule.length;

  // Get unpaid installments (overdue + pending)
  const unpaidSchedule = optimisticSchedule.filter((i) => i.status !== 'paid');

  // Get next payment (first unpaid)
  const nextPayment = unpaidSchedule.length > 0 ? unpaidSchedule[0] : null;

  // Count stats
  const today = new Date().toISOString().split('T')[0];
  const overdueCount = optimisticSchedule.filter((entry) => entry.status === 'overdue').length;
  const pendingUntilTodayCount = optimisticSchedule.filter(
    (entry) =>
      (entry.status === 'pending' || entry.status === 'overdue') &&
      entry.due_date <= today
  ).length;

  // Menu options
  const menuOptions: MenuItem[] = [
    {
      label: 'Prepojiť s majetkom',
      icon: '🏠',
      onPress: () => router.push(`/(tabs)/loans/${id}/link-asset`),
    },
    {
      label: 'Simulovať scenáre',
      icon: '📊',
      onPress: () => router.push(`/(tabs)/loans/${id}/simulate`),
    },
    {
      label: 'Upraviť úver',
      icon: '✏️',
      onPress: () => router.push(`/(tabs)/loans/${id}/edit`),
    },
    {
      label: 'Predčasne splatiť',
      icon: '💰',
      onPress: () => router.push(`/(tabs)/loans/${id}/early-repayment`),
    },
    {
      label: 'Zmazať úver',
      icon: '🗑️',
      destructive: true,
      onPress: handleDelete,
    },
  ];

  // Filter schedule based on selected filter
  // Get filtered schedule based on current filter
  const getFilteredSchedule = () => {
    switch (scheduleFilter) {
      case 'overdue':
        return optimisticSchedule.filter((i) => i.status === 'overdue');
      case 'unpaid':
        // Show overdue + pending (not paid)
        return optimisticSchedule.filter((i) => i.status !== 'paid');
      case 'all':
        return optimisticSchedule;
      default:
        return optimisticSchedule.filter((i) => i.status !== 'paid');
    }
  };

  // Get paid installments for history section
  const paidInstallmentsCount = optimisticSchedule.filter((i) => i.status === 'paid').length;

  // Render Overview Tab content
  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Compact Hero Card */}
      <CompactHeroCard
        loanName={loan.name || ''}
        lenderName={loan.lender}
        status={loan.status as 'active' | 'paid_off'}
        remainingBalance={parseFloat(String(loan.remaining_balance)) || 0}
        principal={parseFloat(String(loan.principal)) || 0}
        progress={progress}
        monthlyPayment={parseFloat(String(loan.monthly_payment)) || 0}
        overdueCount={overdueCount}
        remainingInstallments={totalInstallments - paidInstallments}
      />

      {/* Next Payment Card */}
      {nextPayment ? (
        <NextPaymentCard
          installmentNo={nextPayment.installment_no}
          amount={parseFloat(nextPayment.total_due) || 0}
          dueDate={nextPayment.due_date}
          status={nextPayment.status}
          daysUntil={calculateDaysUntil(nextPayment.due_date)}
          onMarkPaid={() => handleMarkInstallmentPaid(nextPayment.id)}
          onViewDetails={() => setActiveTab('schedule')}
        />
      ) : (
        <NextPaymentCard
          installmentNo={0}
          amount={0}
          dueDate=""
          status="paid"
          daysUntil={0}
          onMarkPaid={() => {}}
        />
      )}

      {/* Collapsible Sections */}
      <CollapsibleSection
        title="Detaily úveru"
        icon={<Info size={18} color={colors.primary} />}
      >
        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Úroková sadzba</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{loan.rate}%</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Obdobie</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{loan.term} mesiacov</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Mesačná splátka</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(loan.monthly_payment)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Zaplatené</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatCurrency(loan.amount_paid)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Začiatok úveru</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(loan.start_date)}</Text>
          </View>
          {loan.end_date && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Koniec úveru</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(loan.end_date)}</Text>
            </View>
          )}
        </View>
      </CollapsibleSection>

      <CollapsibleSection
        title="Finančný prehľad"
        icon={<PieChart size={18} color={colors.primary} />}
      >
        <LoanFinancialOverview
          principal={parseFloat(String(loan.principal)) || 0}
          totalInterest={parseFloat(String(loan.total_interest)) || calculateTotalInterest()}
          totalFees={parseFloat(String(loan.total_fees || loan.fee_setup || 0)) +
            (parseFloat(String(loan.fee_monthly || 0)) * (loan.term || 0))}
          paidPrincipal={parseFloat(String(loan.paid_principal || loan.amount_paid)) || 0}
          paidInterest={calculatePaidInterest()}
          remainingPrincipal={parseFloat(String(loan.remaining_balance)) || 0}
          remainingInterest={Math.max(0, (parseFloat(String(loan.total_interest)) || calculateTotalInterest()) - calculatePaidInterest())}
          monthlyPayment={parseFloat(String(loan.monthly_payment)) || 0}
        />
      </CollapsibleSection>

      {optimisticSchedule.length > 0 && (
        <CollapsibleSection
          title="Míľniky"
          icon={<Target size={18} color={colors.primary} />}
          badge={`${Math.round(progress)}%`}
          badgeVariant="default"
        >
          <LoanMilestones
            progress={progress}
            startDate={loan.start_date}
            endDate={loan.end_date || calculateEndDate()}
            schedule={optimisticSchedule}
            principal={parseFloat(String(loan.principal)) || 0}
          />
        </CollapsibleSection>
      )}
    </View>
  );

  // Render Schedule Tab content
  const renderScheduleTab = () => {
    const filteredSchedule = getFilteredSchedule();

    // Counts for display
    const unpaidCount = optimisticSchedule.filter((i) => i.status !== 'paid').length;
    const overdueFilterCount = optimisticSchedule.filter((i) => i.status === 'overdue').length;

    // Filter chips config - simplified
    const filterChips: Array<{ id: 'unpaid' | 'overdue' | 'all'; label: string; count: number; isDanger?: boolean }> = [
      { id: 'unpaid', label: 'Neuhradené', count: unpaidCount },
      { id: 'overdue', label: 'Po splatnosti', count: overdueFilterCount, isDanger: overdueFilterCount > 0 },
    ];

    return (
      <View style={styles.tabContent}>
        {/* Filter Chips - simplified */}
        <View style={styles.filterChips}>
          {filterChips.map((chip) => {
            const isActive = scheduleFilter === chip.id;
            return (
              <TouchableOpacity
                key={chip.id}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surfacePressed,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setScheduleFilter(chip.id);
                  setShowPaidHistory(false); // Reset paid history when changing filter
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isActive ? '#ffffff' : colors.textSecondary },
                  ]}
                >
                  {chip.label}
                </Text>
                <View
                  style={[
                    styles.filterChipBadge,
                    {
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.2)'
                        : chip.isDanger
                          ? colors.dangerLight
                          : colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipBadgeText,
                      {
                        color: isActive
                          ? '#ffffff'
                          : chip.isDanger
                            ? colors.danger
                            : colors.textMuted,
                      },
                    ]}
                  >
                    {chip.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bulk Action */}
        {pendingUntilTodayCount > 0 && (
          <View style={styles.bulkAction}>
            <Button onPress={handleMarkAllUntilToday} variant="primary" fullWidth>
              {`Označiť ${pendingUntilTodayCount} ${pendingUntilTodayCount === 1 ? 'splátku' : 'splátok'} do dnes`}
            </Button>
          </View>
        )}

        {/* Schedule List */}
        <Card>
          <View style={styles.scheduleHeader}>
            <Text style={[styles.scheduleTitle, { color: colors.text }]}>
              {scheduleFilter === 'overdue' ? 'Po splatnosti' : 'Neuhradené splátky'}
            </Text>
            <Text style={[styles.scheduleCount, { color: colors.primary }]}>
              {paidInstallments} / {totalInstallments}
            </Text>
          </View>

          {filteredSchedule.length === 0 ? (
            <View style={styles.emptySchedule}>
              <CheckCircle size={32} color={colors.success} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {scheduleFilter === 'overdue'
                  ? 'Žiadne splátky po splatnosti'
                  : 'Všetky splátky sú uhradené'}
              </Text>
            </View>
          ) : (
            filteredSchedule.map((entry) => (
              <SwipeableInstallmentCard
                key={entry.id}
                entry={entry}
                onMarkPaid={handleMarkInstallmentPaid}
                onEditPayment={(entryId) => {
                  router.push(`/(tabs)/loans/${id}/pay?installmentId=${entryId}`);
                }}
                onCustomDatePayment={(entryId) => {
                  router.push(`/(tabs)/loans/${id}/pay?installmentId=${entryId}`);
                }}
                onRemovePayment={async (entryId) => {
                  try {
                    const entryToRemove = schedule.find((e) => e.id === entryId);
                    if (!entryToRemove) return;

                    setOptimisticSchedule((prev) =>
                      prev.map((e) =>
                        e.id === entryId
                          ? { ...e, status: 'pending' as const, paid_at: null }
                          : e
                      )
                    );

                    const { data: { session } } = await supabase.auth.getSession();

                    const response = await fetch(
                      `${process.env.EXPO_PUBLIC_API_URL}/api/loans/${id}/schedules/${entryId}/unpay`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${session?.access_token}`,
                        },
                      }
                    );

                    if (!response.ok) {
                      throw new Error('Failed to remove payment');
                    }

                    await refetch();
                    showToast('Platba bola odstránená', 'success');
                  } catch (err) {
                    console.error('Error removing payment:', err);
                    setOptimisticSchedule(schedule);
                    showToast('Nepodarilo sa odstrániť platbu', 'error');
                  }
                }}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
              />
            ))
          )}
        </Card>

        {/* Show Paid History Button */}
        {paidInstallmentsCount > 0 && scheduleFilter !== 'all' && (
          <TouchableOpacity
            style={[
              styles.showHistoryButton,
              {
                backgroundColor: colors.surfacePressed,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPaidHistory(!showPaidHistory);
            }}
          >
            <CheckCircle size={18} color={colors.success} />
            <Text style={[styles.showHistoryText, { color: colors.textSecondary }]}>
              {showPaidHistory ? 'Skryť uhradené splátky' : `Zobraziť uhradené splátky (${paidInstallmentsCount})`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Paid Installments History */}
        {showPaidHistory && paidInstallmentsCount > 0 && (
          <Card style={styles.paidHistoryCard}>
            <View style={styles.scheduleHeader}>
              <Text style={[styles.scheduleTitle, { color: colors.success }]}>
                Uhradené splátky
              </Text>
              <Text style={[styles.scheduleCount, { color: colors.success }]}>
                {paidInstallmentsCount}
              </Text>
            </View>
            {optimisticSchedule
              .filter((i) => i.status === 'paid')
              .map((entry) => (
                <SwipeableInstallmentCard
                  key={entry.id}
                  entry={entry}
                  onMarkPaid={handleMarkInstallmentPaid}
                  onEditPayment={(entryId) => {
                    router.push(`/(tabs)/loans/${id}/pay?installmentId=${entryId}`);
                  }}
                  onCustomDatePayment={(entryId) => {
                    router.push(`/(tabs)/loans/${id}/pay?installmentId=${entryId}`);
                  }}
                  onRemovePayment={async (entryId) => {
                    try {
                      setOptimisticSchedule((prev) =>
                        prev.map((e) =>
                          e.id === entryId
                            ? { ...e, status: 'pending' as const, paid_at: null }
                            : e
                        )
                      );

                      const { data: { session } } = await supabase.auth.getSession();

                      const response = await fetch(
                        `${process.env.EXPO_PUBLIC_API_URL}/api/loans/${id}/schedules/${entryId}/unpay`,
                        {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${session?.access_token}`,
                          },
                        }
                      );

                      if (!response.ok) {
                        throw new Error('Failed to remove payment');
                      }

                      await refetch();
                      showToast('Platba bola odstránená', 'success');
                    } catch (err) {
                      console.error('Error removing payment:', err);
                      setOptimisticSchedule(schedule);
                      showToast('Nepodarilo sa odstrániť platbu', 'error');
                    }
                  }}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              ))}
          </Card>
        )}
      </View>
    );
  };

  // Render Documents Tab content
  const renderDocumentsTab = () => (
    <View style={styles.tabContent}>
      {/* Documents Section */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <FileText size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Dokumenty</Text>
            {documents.length > 0 && (
              <View style={[styles.sectionBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.sectionBadgeText, { color: colors.primary }]}>
                  {documents.length}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Upload buttons */}
        <View style={styles.uploadButtonsRow}>
          <TouchableOpacity
            style={[styles.uploadDocButton, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}
            onPress={() => handleUploadDocument('contract')}
            disabled={isUploadingDoc}
          >
            {isUploadingDoc ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Upload size={16} color={colors.primary} />
                <Text style={[styles.uploadDocText, { color: colors.primary }]}>Zmluva</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadDocButton, { backgroundColor: colors.surfacePressed, borderColor: colors.border }]}
            onPress={() => handleUploadDocument('payment_schedule')}
            disabled={isUploadingDoc}
          >
            {isUploadingDoc ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Upload size={16} color={colors.primary} />
                <Text style={[styles.uploadDocText, { color: colors.primary }]}>Kalendár</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {documentsLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : documents.length === 0 ? (
          <View style={styles.emptySection}>
            <FileText size={32} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              Žiadne dokumenty
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Nahrajte zmluvu alebo splátkový kalendár
            </Text>
          </View>
        ) : (
          <View style={styles.documentsList}>
            {documents.map((doc) => (
              <DocumentListItem
                key={doc.id}
                id={doc.id}
                name={doc.name}
                documentType={doc.documentType}
                documentTypeLabel={LOAN_DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                filePath={doc.filePath}
                fileSize={doc.fileSize}
                mimeType={doc.mimeType}
                createdAt={doc.createdAt}
                onDelete={handleDeleteDocument}
              />
            ))}
          </View>
        )}
      </Card>

      {/* Notes Section */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <StickyNote size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Poznámky</Text>
            {notes.length > 0 && (
              <View style={[styles.sectionBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.sectionBadgeText, { color: colors.primary }]}>
                  {notes.length}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddNote}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.addButtonText}>Pridať</Text>
          </TouchableOpacity>
        </View>

        {notesLoading ? (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.emptySection}>
            <StickyNote size={32} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              Žiadne poznámky
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Pridajte poznámku k tomuto úveru
            </Text>
          </View>
        ) : (
          <View style={styles.notesList}>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onToggleStatus={handleToggleNoteStatus}
                onTogglePin={handleToggleNotePin}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
              />
            ))}
          </View>
        )}
      </Card>
    </View>
  );

  return (
    <GestureHandlerRootView style={styles.gestureContainer}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/loans')} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {loan.name || loan.lender}
            </Text>
          </View>
          <OptionsMenu options={menuOptions} title="Akcie úveru" />
        </View>

        {/* Tabs */}
        <LoanDetailTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          overdueCount={overdueCount}
          documentsCount={documents.length + notes.length}
        />

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'schedule' && renderScheduleTab()}
          {activeTab === 'documents' && renderDocumentsTab()}
        </ScrollView>

        {/* Floating Action Button */}
        {loan.status === 'active' && overdueCount > 0 && activeTab === 'overview' && (
          <FloatingActionButton
            icon={<AlertTriangle size={24} color="#ffffff" />}
            label={`${overdueCount} po splatnosti`}
            backgroundColor={colors.danger}
            onPress={handleMarkAllUntilToday}
          />
        )}

        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast({ ...toast, visible: false })}
        />

        {/* Note Editor Modal */}
        <NoteEditorModal
          visible={noteEditorVisible}
          note={editingNote}
          onSave={handleSaveNote}
          onClose={() => {
            setNoteEditorVisible(false);
            setEditingNote(null);
          }}
          title="Poznámka k úveru"
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 26,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  tabContent: {
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
    textAlign: 'center',
    marginBottom: 24,
  },
  // Details grid
  detailsGrid: {
    gap: 0,
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
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Filter chips
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterChipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Bulk action
  bulkAction: {
    marginBottom: 16,
  },
  // Schedule
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scheduleCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptySchedule: {
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  // Show history button
  showHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  showHistoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paidHistoryCard: {
    marginTop: 16,
  },
  // Section card
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Upload buttons
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  uploadDocButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  uploadDocText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Loading/Empty states
  loadingSection: {
    padding: 24,
    alignItems: 'center',
  },
  emptySection: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  documentsList: {
    gap: 0,
  },
  notesList: {
    gap: 0,
  },
});
