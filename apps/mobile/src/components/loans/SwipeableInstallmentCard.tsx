import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

interface LoanScheduleEntry {
  id: string;
  loan_id: string;
  installment_no: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  fees_due: string;
  total_due: string;
  principal_balance_after: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
}

interface SwipeableInstallmentCardProps {
  entry: LoanScheduleEntry;
  onMarkPaid: (entryId: string) => void;
  onEditPayment?: (entryId: string) => void;
  onCustomDatePayment?: (entryId: string) => void;
  onRemovePayment?: (entryId: string) => void;
  formatCurrency: (amount: string | number) => string;
  formatDate: (date: string) => string;
}

export function SwipeableInstallmentCard({
  entry,
  onMarkPaid,
  onEditPayment,
  onCustomDatePayment,
  onRemovePayment,
  formatCurrency,
  formatDate,
}: SwipeableInstallmentCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const [expanded, setExpanded] = React.useState(false);

  const isPaid = entry.status === 'paid';
  const isOverdue = entry.status === 'overdue';
  const isPending = entry.status === 'pending';

  // Handle tap - toggle rozkliknutie detailov
  const handleTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(!expanded);
  };

  // Swipe doprava - rýchle označenie ako uhradené
  const handleSwipeRight = () => {
    if (isPaid) return;
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onMarkPaid(entry.id);
    swipeableRef.current?.close();
  };

  // Render swipe doprava akciu (zelené pozadie) s animáciou
  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (isPaid) return null;

    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <RectButton style={styles.swipeRightAction} onPress={handleSwipeRight}>
        <Animated.View style={[styles.swipeRightContent, { transform: [{ scale }] }]}>
          <Text style={styles.swipeRightText}>✓</Text>
          <Text style={styles.swipeRightLabel}>Uhradené</Text>
        </Animated.View>
      </RectButton>
    );
  };

  // Render swipe doľava akcie (možnosti) s animáciou
  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });

    if (isPaid) {
      return (
        <Animated.View style={[styles.swipeLeftAction, { transform: [{ scale }] }]}>
          <RectButton
            style={styles.swipeActionButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              swipeableRef.current?.close();
              if (onRemovePayment) {
                Alert.alert(
                  'Odstrániť platbu',
                  'Naozaj chcete odstrániť túto platbu?',
                  [
                    { text: 'Zrušiť', style: 'cancel' },
                    {
                      text: 'Odstrániť',
                      style: 'destructive',
                      onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onRemovePayment(entry.id);
                      },
                    },
                  ]
                );
              }
            }}
          >
            <Text style={styles.swipeActionIcon}>❌</Text>
            <Text style={styles.swipeActionLabel}>Odstrániť</Text>
          </RectButton>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={[styles.swipeLeftAction, { transform: [{ scale }] }]}>
        <RectButton
          style={styles.swipeActionButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            swipeableRef.current?.close();
            if (onCustomDatePayment) onCustomDatePayment(entry.id);
          }}
        >
          <Text style={styles.swipeActionIcon}>📅</Text>
          <Text style={styles.swipeActionLabel}>Dátum</Text>
        </RectButton>
        <RectButton
          style={styles.swipeActionButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            swipeableRef.current?.close();
            if (onEditPayment) onEditPayment(entry.id);
          }}
        >
          <Text style={styles.swipeActionIcon}>📝</Text>
          <Text style={styles.swipeActionLabel}>Upraviť</Text>
        </RectButton>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={(direction) => {
        if (direction === 'right' && !isPaid) {
          handleSwipeRight();
        }
      }}
      overshootRight={false}
      overshootLeft={false}
      friction={1.5}
      leftThreshold={60}
      rightThreshold={60}
    >
      <TouchableOpacity
        onPress={handleTap}
        activeOpacity={0.7}
        style={[
          styles.card,
          isPaid && styles.cardPaid,
          isOverdue && styles.cardOverdue,
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            {isPaid && <Text style={styles.statusIcon}>✓</Text>}
            {isOverdue && <Text style={styles.statusIcon}>⚠️</Text>}
            <Text style={[styles.installmentNo, isPaid && styles.textPaid]}>
              #{entry.installment_no}
            </Text>
          </View>
          <Text style={[styles.amount, isPaid && styles.textPaid]}>
            {formatCurrency(entry.total_due)}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.dueDate, isPaid && styles.textPaid]}>
            Splatnosť: {formatDate(entry.due_date)}
          </Text>
          {isPaid && entry.paid_at && (
            <Text style={styles.paidDate}>
              Uhradené: {formatDate(entry.paid_at)}
            </Text>
          )}
          {isOverdue && (
            <Text style={styles.overdueText}>
              📅 Po splatnosti
            </Text>
          )}
        </View>

        {isPending && !expanded && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              ⊳ Swipe doprava = zaplatené | Tap = detaily
            </Text>
          </View>
        )}

        {/* Expanded details */}
        {expanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            
            {/* Rozloženie splátky */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Istina</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(entry.principal_due)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Úrok</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(entry.interest_due)}
                </Text>
              </View>
              {Number(entry.fees_due) > 0 && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Poplatky</Text>
                  <Text style={styles.detailValue}>
                    {formatCurrency(entry.fees_due)}
                  </Text>
                </View>
              )}
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Zostatok po splátke</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(entry.principal_balance_after)}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            {!isPaid && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onMarkPaid(entry.id);
                    setExpanded(false);
                  }}
                >
                  <Text style={styles.primaryButtonText}>✓ Označiť ako uhradené</Text>
                </TouchableOpacity>
                
                <View style={styles.secondaryActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={() => {
                      if (onCustomDatePayment) {
                        onCustomDatePayment(entry.id);
                        setExpanded(false);
                      }
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>📅 Vlastný dátum</Text>
                  </TouchableOpacity>
                  
                  {onEditPayment && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.secondaryButton]}
                      onPress={() => {
                        onEditPayment(entry.id);
                        setExpanded(false);
                      }}
                    >
                      <Text style={styles.secondaryButtonText}>📝 Upraviť</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Remove payment for paid installments */}
            {isPaid && onRemovePayment && (
              <TouchableOpacity
                style={[styles.actionButton, styles.destructiveButton]}
                onPress={() => {
                  Alert.alert(
                    'Odstrániť platbu',
                    'Naozaj chcete odstrániť túto platbu?',
                    [
                      { text: 'Zrušiť', style: 'cancel' },
                      {
                        text: 'Odstrániť',
                        style: 'destructive',
                        onPress: () => {
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          onRemovePayment(entry.id);
                          setExpanded(false);
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.destructiveButtonText}>❌ Odstrániť platbu</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardPaid: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  cardOverdue: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIcon: {
    fontSize: 18,
  },
  installmentNo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  textPaid: {
    color: '#166534',
  },
  cardBody: {
    gap: 4,
  },
  dueDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  paidDate: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '500',
  },
  overdueText: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '500',
    marginTop: 4,
  },
  hint: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  hintText: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  // Expanded content
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  detailsGrid: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  actionButtons: {
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#8b5cf6',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
  },
  destructiveButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  destructiveButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  // Swipe actions
  swipeRightAction: {
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    marginBottom: 12,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    flex: 1,
  },
  swipeRightContent: {
    alignItems: 'center',
  },
  swipeRightText: {
    fontSize: 32,
    color: '#ffffff',
  },
  swipeRightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
  swipeLeftAction: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  swipeActionButton: {
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    minWidth: 80,
  },
  swipeActionIcon: {
    fontSize: 24,
  },
  swipeActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 4,
  },
});

