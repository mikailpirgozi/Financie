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
import { Plus, StickyNote, AlertTriangle, Calendar, CheckCircle, FileText, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { type Loan, type LoanSchedule, type LoanDocument, getLoanDocuments, createLoanDocument, deleteLoanDocument } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { env } from '@/lib/env';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { SwipeableInstallmentCard } from '@/components/loans/SwipeableInstallmentCard';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { OptionsMenu, type MenuItem } from '@/components/ui/OptionsMenu';
import { NoteCard, type LoanNote } from '@/components/loans/NoteCard';
import { NoteEditorModal } from '@/components/loans/NoteEditorModal';
import { LoanFinancialOverview } from '@/components/loans/LoanFinancialOverview';
import { LoanMilestones } from '@/components/loans/LoanMilestones';
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

  // React Query hooks for data fetching and mutations
  const { data: loanData, isLoading: loading, error: queryError, refetch } = useLoan(id!);
  const markInstallmentPaidMutation = useMarkInstallmentPaid();
  const markPaidUntilTodayMutation = useMarkPaidUntilToday();

  // Derive loan and schedule from query data
  const loan = loanData?.loan || null;
  
  // Process schedule to mark overdue entries - stabilize empty array reference
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
  const [showPaidInstallments, setShowPaidInstallments] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  // Track previous schedule signature to avoid unnecessary updates
  const prevScheduleSignatureRef = useRef<string>('');
  
  // Sync optimistic schedule with actual schedule when data changes
  React.useEffect(() => {
    // Create a signature based on schedule content (IDs and statuses)
    const scheduleSignature = schedule
      .map((entry) => `${entry.id}:${entry.status}`)
      .join(',');
    
    // Only update if signature changed
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
    getCurrentHousehold().then(h => setHouseholdId(h.id)).catch(console.error);
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

      // Upload file to storage
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

      // Create loan document record
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
    } catch (error) {
      console.error('Upload error:', error);
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
        editingNote ? 'Poznamka bola upravena' : 'Poznamka bola pridana',
        'success'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Failed to save note:', err);
      showToast('Nepodarilo sa ulozit poznamku', 'error');
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

      // Optimistic update
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, status: newStatus } : n))
      );
    } catch (err) {
      console.error('Failed to toggle note status:', err);
      showToast('Nepodarilo sa aktualizovat poznamku', 'error');
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

      await loadNotes(); // Reload to get proper sorting
    } catch (err) {
      console.error('Failed to toggle note pin:', err);
      showToast('Nepodarilo sa aktualizovat poznamku', 'error');
    }
  };

  // Handle note delete
  const handleDeleteNote = async (noteId: string) => {
    Alert.alert(
      'Zmazat poznamku',
      'Naozaj chcete zmazat tuto poznamku?',
      [
        { text: 'Zrusit', style: 'cancel' },
        {
          text: 'Zmazat',
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
              showToast('Poznamka bola zmazana', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              console.error('Failed to delete note:', err);
              showToast('Nepodarilo sa zmazat poznamku', 'error');
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

  // Handle marking single installment as paid using mutation hook
  const handleMarkInstallmentPaid = async (installmentId: string) => {
    // Optimistic update
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
          // Data is automatically refetched via query invalidation
        },
        onError: () => {
          // Rollback on error
          setOptimisticSchedule(schedule);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast('Nepodarilo sa označiť splátku', 'error');
        },
      }
    );
  };

  // Handle refresh using React Query refetch
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Handle marking all installments until today as paid using mutation hook
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
                  // Data is automatically refetched via query invalidation
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
              const { error } = await supabase
                .from('loans')
                .delete()
                .eq('id', id);

              if (error) throw error;

              showToast('Úver bol zmazaný', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              setTimeout(() => {
                router.back();
              }, 1500);
            } catch (error) {
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


  const calculateProgress = (loan: Loan): number => {
    const principal = typeof loan.principal === 'string' ? parseFloat(loan.principal) : loan.principal;
    const amountPaid = typeof loan.amount_paid === 'string' ? parseFloat(loan.amount_paid) : loan.amount_paid;
    if (principal === 0 || isNaN(principal) || isNaN(amountPaid)) return 0;
    return (amountPaid / principal) * 100;
  };

  const getStatusLabel = (status: string): string => {
    if (status === 'paid_off') return 'Splatený';
    if (status === 'active') return 'Aktívny';
    return status;
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
      // Calculate from start date and term
      if (loan?.start_date && loan?.term) {
        const startDate = new Date(loan.start_date);
        startDate.setMonth(startDate.getMonth() + loan.term);
        return startDate.toISOString().split('T')[0] || '';
      }
      return new Date().toISOString().split('T')[0] || '';
    }
    // Get last schedule entry date
    const lastEntry = schedule[schedule.length - 1];
    return lastEntry?.due_date || new Date().toISOString().split('T')[0] || '';
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

  if (error || !loan) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Úver nebol nájdený'}</Text>
          <Button onPress={() => router.back()} variant="outline">
            Späť
          </Button>
        </View>
      </View>
    );
  }

  const progress = calculateProgress(loan);
  const paidInstallments = optimisticSchedule.filter((i) => i.status === 'paid').length;
  const totalInstallments = optimisticSchedule.length;
  
  // Smart display: show unpaid + last 1 paid (most recent)
  const unpaidSchedule = optimisticSchedule.filter((i) => i.status !== 'paid');
  const paidSchedule = optimisticSchedule.filter((i) => i.status === 'paid');
  const lastPaid = paidSchedule.length > 0 ? [paidSchedule[paidSchedule.length - 1]] : [];
  
  const displayedSchedule = showPaidInstallments
    ? optimisticSchedule
    : [...lastPaid, ...unpaidSchedule];
  
  // Count pending installments until today for bulk action
  const today = new Date().toISOString().split('T')[0];
  const pendingUntilTodayCount = optimisticSchedule.filter(
    (entry) =>
      (entry.status === 'pending' || entry.status === 'overdue') &&
      entry.due_date <= today
  ).length;

  // Smart FAB indicators
  const overdueCount = optimisticSchedule.filter(
    (entry) => entry.status === 'overdue'
  ).length;
  
  const dueTodayCount = optimisticSchedule.filter(
    (entry) => entry.status === 'pending' && entry.due_date === today
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

  return (
    <GestureHandlerRootView style={styles.gestureContainer}>
    <View style={styles.container}>
        {/* Header with menu */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {loan.name || loan.lender}
            </Text>
          </View>
          <OptionsMenu options={menuOptions} title="Akcie úveru" />
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8b5cf6"
              colors={['#8b5cf6']}
            />
          }
        >
        <View style={styles.content}>
          {/* Overview Card */}
          <Card style={styles.overviewCard}>
            <Text style={styles.lender}>{loan.name || loan.lender}</Text>
            {loan.name && <Text style={styles.sublender}>{loan.lender}</Text>}
            <Badge variant={loan.status === 'paid_off' ? 'success' : 'default'}>
              {getStatusLabel(loan.status)}
            </Badge>

            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.remainingLabel}>Zostáva</Text>
                  <Text style={styles.remainingAmount}>
                    {formatCurrency(loan.remaining_balance)}
                  </Text>
                </View>
                <View style={styles.alignRight}>
                  <Text style={styles.totalLabel}>Pôvodná suma</Text>
                  <Text style={styles.totalAmount}>{formatCurrency(loan.principal)}</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: loan.status === 'paid_off' ? '#10b981' : '#8b5cf6',
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progress)}% splatené
              </Text>
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{overdueCount}</Text>
                <Text style={styles.statLabel}>Po splatnosti</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{formatCurrency(loan.monthly_payment)}</Text>
                <Text style={styles.statLabel}>Mesačná splátka</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalInstallments - paidInstallments}</Text>
                <Text style={styles.statLabel}>Zostáva splátok</Text>
              </View>
            </View>
          </Card>

          {/* Loan Details Card */}
          <Card>
            <Text style={styles.sectionTitle}>Detaily úveru</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Úroková sadzba</Text>
              <Text style={styles.detailValue}>{loan.rate}%</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Obdobie</Text>
              <Text style={styles.detailValue}>{loan.term} mesiacov</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Suma mesačnej splátky</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(loan.monthly_payment)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Zaplatené</Text>
              <Text style={styles.detailValue}>{formatCurrency(loan.amount_paid)}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Začiatok úveru</Text>
              <Text style={styles.detailValue}>{formatDate(loan.start_date)}</Text>
            </View>

            {loan.end_date && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Koniec úveru</Text>
                <Text style={styles.detailValue}>{formatDate(loan.end_date)}</Text>
              </View>
            )}
          </Card>

          {/* Financial Overview */}
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

          {/* Milestones */}
          {optimisticSchedule.length > 0 && (
            <LoanMilestones
              progress={progress}
              startDate={loan.start_date}
              endDate={loan.end_date || calculateEndDate()}
              schedule={optimisticSchedule}
              principal={parseFloat(String(loan.principal)) || 0}
            />
          )}

          {/* Payment Schedule */}
          {optimisticSchedule.length > 0 && (
            <Card>
              <View style={styles.scheduleHeader}>
                <Text style={styles.sectionTitle}>Splátkový kalendár</Text>
                <Text style={styles.scheduleProgress}>
                  {paidInstallments} / {totalInstallments}
                </Text>
              </View>

              {/* Smart Context Hint */}
              {overdueCount > 0 && (
                <View style={[styles.contextHint, styles.contextHintDanger]}>
                  <AlertTriangle size={16} color={colors.danger} />
                  <Text style={styles.contextHintText}>
                    Mate {overdueCount} {overdueCount === 1 ? 'splatku' : 'splatok'} po splatnosti
                  </Text>
                </View>
              )}
              {overdueCount === 0 && dueTodayCount > 0 && (
                <View style={[styles.contextHint, styles.contextHintWarning]}>
                  <Calendar size={16} color={colors.warning} />
                  <Text style={styles.contextHintText}>
                    Dnes je splatnost {dueTodayCount} {dueTodayCount === 1 ? 'splatky' : 'splatok'}
                  </Text>
                </View>
              )}
              {overdueCount === 0 && dueTodayCount === 0 && paidInstallments === totalInstallments && (
                <View style={[styles.contextHint, styles.contextHintSuccess]}>
                  <CheckCircle size={16} color={colors.success} />
                  <Text style={styles.contextHintText}>
                    Vsetky splatky uhradene
                  </Text>
                </View>
              )}
              {overdueCount === 0 && dueTodayCount === 0 && paidInstallments < totalInstallments && pendingUntilTodayCount === 0 && (
                <View style={[styles.contextHint, styles.contextHintSuccess]}>
                  <CheckCircle size={16} color={colors.success} />
                  <Text style={styles.contextHintText}>
                    Vsetky splatky uhradene do dnes
                  </Text>
                </View>
              )}

              {/* Bulk Action Button */}
              {pendingUntilTodayCount > 0 && (
                <View style={styles.bulkActionContainer}>
                  <Button
                    onPress={handleMarkAllUntilToday}
                    variant="primary"
                    fullWidth
                  >
                    {`Oznacit ${pendingUntilTodayCount} ${pendingUntilTodayCount === 1 ? 'splatku' : 'splatok'} do dnes`}
                  </Button>
                </View>
              )}

              {displayedSchedule.map((entry) => (
                <SwipeableInstallmentCard
                  key={entry.id}
                  entry={entry}
                  onMarkPaid={handleMarkInstallmentPaid}
                  onEditPayment={(entryId) => {
                    // TODO: Implementovať edit payment screen
                    router.push(`/(tabs)/loans/${id}/pay?installmentId=${entryId}`);
                  }}
                  onCustomDatePayment={(entryId) => {
                    // TODO: Implementovať custom date picker
                    router.push(`/(tabs)/loans/${id}/pay?installmentId=${entryId}`);
                  }}
                  onRemovePayment={async (entryId) => {
                    try {
                      const entryToRemove = schedule.find((e) => e.id === entryId);
                      if (!entryToRemove) return;

                      // Optimistic update
                      setOptimisticSchedule((prev) =>
                        prev.map((e) =>
                          e.id === entryId
                            ? { ...e, status: 'pending' as const, paid_at: null }
                            : e
                        )
                      );

                      const {
                        data: { session },
                      } = await supabase.auth.getSession();

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

                      // Reload data via React Query refetch
                      await refetch();

                      setToast({
                        visible: true,
                        message: 'Platba bola odstránená',
                        type: 'success',
                      });
                    } catch (err) {
                      console.error('Error removing payment:', err);
                      // Revert optimistic update
                      setOptimisticSchedule(schedule);
                      setToast({
                        visible: true,
                        message: 'Nepodarilo sa odstrániť platbu',
                        type: 'error',
                      });
                    }
                  }}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              ))}

              {paidSchedule.length > 1 && !showPaidInstallments && (
                <TouchableOpacity
                  style={styles.showHistoryButton}
                  onPress={() => setShowPaidInstallments(true)}
                >
                  <Text style={styles.showHistoryText}>
                    Zobraziť históriu ({paidSchedule.length - 1} zaplatených)
                  </Text>
                </TouchableOpacity>
              )}

              {showPaidInstallments && paidSchedule.length > 0 && (
                <TouchableOpacity
                  style={styles.showHistoryButton}
                  onPress={() => setShowPaidInstallments(false)}
                >
                  <Text style={styles.showHistoryText}>Skryt historiu</Text>
                </TouchableOpacity>
              )}
            </Card>
          )}

          {/* Documents Section */}
          <Card style={styles.documentsCard}>
            <View style={styles.documentsHeader}>
              <View style={styles.documentsTitleRow}>
                <FileText size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Dokumenty
                </Text>
                {documents.length > 0 && (
                  <View style={[styles.documentsBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.documentsBadgeText, { color: colors.primary }]}>
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
              <View style={styles.documentsLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : documents.length === 0 ? (
              <View style={styles.documentsEmpty}>
                <FileText size={32} color={colors.textMuted} />
                <Text style={[styles.documentsEmptyText, { color: colors.textSecondary }]}>
                  Žiadne dokumenty
                </Text>
                <Text style={[styles.documentsEmptyHint, { color: colors.textMuted }]}>
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
          <Card style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <View style={styles.notesTitleRow}>
                <StickyNote size={20} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Poznamky
                </Text>
                {notes.length > 0 && (
                  <View style={[styles.notesBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.notesBadgeText, { color: colors.primary }]}>
                      {notes.length}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[styles.addNoteButton, { backgroundColor: colors.primary }]}
                onPress={handleAddNote}
              >
                <Plus size={18} color={colors.textInverse} />
                <Text style={[styles.addNoteText, { color: colors.textInverse }]}>
                  Pridat
                </Text>
              </TouchableOpacity>
            </View>

            {notesLoading ? (
              <View style={styles.notesLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : notes.length === 0 ? (
              <View style={styles.notesEmpty}>
                <StickyNote size={32} color={colors.textMuted} />
                <Text style={[styles.notesEmptyText, { color: colors.textSecondary }]}>
                  Ziadne poznamky
                </Text>
                <Text style={[styles.notesEmptyHint, { color: colors.textMuted }]}>
                  Pridajte poznamku k tomuto uveru
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
      </ScrollView>

      {/* Floating Action Button - smart color indicators */}
      {loan.status === 'active' && overdueCount > 0 && (
        <FloatingActionButton
          icon={<AlertTriangle size={24} color="#ffffff" />}
          label={`${overdueCount} po splatnosti`}
          backgroundColor={colors.danger}
          onPress={handleMarkAllUntilToday}
        />
      )}
      
      {loan.status === 'active' && overdueCount === 0 && dueTodayCount > 0 && (
        <FloatingActionButton
          icon={<Calendar size={24} color="#ffffff" />}
          label={`${dueTodayCount} dnes`}
          backgroundColor={colors.warning}
          onPress={handleMarkAllUntilToday}
        />
      )}

      {loan.status === 'active' && overdueCount === 0 && dueTodayCount === 0 && pendingUntilTodayCount > 0 && (
        <FloatingActionButton
          icon={<CheckCircle size={24} color="#ffffff" />}
          label={`${pendingUntilTodayCount}`}
          backgroundColor={colors.primary}
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
        title="Poznamka k uveru"
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
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    fontSize: 26,
    fontWeight: '600',
    color: '#374151',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.3,
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
  overviewCard: {
    marginBottom: 16,
  },
  lender: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sublender: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  progressSection: {
    marginTop: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  remainingLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  remainingAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8b5cf6',
  },
  alignRight: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  quickStats: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
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
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleProgress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  contextHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  contextHintDanger: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  contextHintWarning: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  contextHintSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  contextHintIcon: {
    fontSize: 16,
  },
  contextHintText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  showHistoryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  showHistoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
  },
  bulkActionContainer: {
    marginBottom: 16,
  },
  // Notes Section Styles
  // Documents Section Styles
  documentsCard: {
    marginTop: 16,
  },
  documentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  documentsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  documentsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  documentsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
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
  documentsLoading: {
    padding: 24,
    alignItems: 'center',
  },
  documentsEmpty: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  documentsEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  documentsEmptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },
  documentsList: {
    gap: 0,
  },
  // Notes Section Styles
  notesCard: {
    marginTop: 16,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  notesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  notesBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addNoteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesLoading: {
    padding: 24,
    alignItems: 'center',
  },
  notesEmpty: {
    alignItems: 'center',
    padding: 24,
    gap: 8,
  },
  notesEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  notesEmptyHint: {
    fontSize: 13,
  },
  notesList: {
    gap: 0,
  },
});

