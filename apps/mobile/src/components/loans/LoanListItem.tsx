import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import {
  ChevronRight,
  AlertTriangle,
  Clock,
  Pin,
  Calendar,
  Percent,
  Hash,
  Car,
  Home,
  CreditCard,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';
import type { Loan } from '../../lib/api';

interface LoanNote {
  id: string;
  content: string;
  priority: 'high' | 'normal' | 'low';
  is_pinned: boolean;
}

interface LoanListItemProps {
  loan: Loan;
  pinnedNote?: LoanNote | null;
  onPress: () => void;
  onLongPress?: () => void;
}

type LoanStatus = 'overdue' | 'due_soon' | 'ok' | 'paid_off';

// Loan type labels and icon components
const LOAN_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof CreditCard; shortLabel: string }
> = {
  annuity: { label: 'Anuitný', icon: CreditCard, shortLabel: 'Anuitný' },
  fixed_principal: { label: 'Fixná istina', icon: Hash, shortLabel: 'Fixný' },
  interest_only: { label: 'Interest-only', icon: Percent, shortLabel: 'IO' },
  auto_loan: { label: 'Auto úver', icon: Car, shortLabel: 'Auto' },
  mortgage: { label: 'Hypotéka', icon: Home, shortLabel: 'Hypo' },
};

export function LoanListItem({
  loan,
  pinnedNote,
  onPress,
  onLongPress,
}: LoanListItemProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const scale = useRef(new Animated.Value(1)).current;

  // Parse numeric values
  const parseAmount = (val: number | string | undefined): number => {
    if (val === undefined || val === null) return 0;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? 0 : num;
  };

  // Determine loan status
  const getLoanStatus = (): LoanStatus => {
    if (loan.status === 'paid_off') return 'paid_off';
    if ((loan.overdue_count || 0) > 0) return 'overdue';

    // Check if due soon (within 5 days)
    const nextInstallment = loan.next_installment;
    if (nextInstallment && nextInstallment.days_until !== undefined) {
      if (nextInstallment.days_until >= 0 && nextInstallment.days_until <= 5) {
        return 'due_soon';
      }
    } else if (loan.next_payment_due_date) {
      const today = new Date();
      const dueDate = new Date(loan.next_payment_due_date);
      const diffDays = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays >= 0 && diffDays <= 5) return 'due_soon';
    }

    return 'ok';
  };

  const status = getLoanStatus();

  const getStatusColor = () => {
    switch (status) {
      case 'overdue':
        return colors.statusOverdue;
      case 'due_soon':
        return colors.statusDueSoon;
      case 'paid_off':
        return colors.statusPaid;
      default:
        return colors.statusActive;
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = parseAmount(amount);
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const calculateProgress = (): number => {
    const principal = parseAmount(loan.principal);
    const amountPaid = parseAmount(loan.amount_paid || loan.paid_principal);
    if (principal === 0) return 0;
    return (amountPaid / principal) * 100;
  };

  const progress = calculateProgress();
  const statusColor = getStatusColor();

  // Get next installment info
  const nextInstallment = loan.next_installment;
  const daysUntil = nextInstallment?.days_until;
  const nextDueDate = nextInstallment?.due_date || loan.next_payment_due_date;

  // Calculate remaining installments
  const totalInstallments = loan.total_installments || loan.term || 0;
  const paidCount = loan.paid_count || 0;
  const remainingInstallments = totalInstallments - paidCount;

  // Get loan type config
  const loanTypeConfig = LOAN_TYPE_CONFIG[loan.loan_type] || {
    label: loan.loan_type,
    shortLabel: loan.loan_type,
    icon: <CreditCard size={12} />,
  };

  // Get annual rate
  const annualRate = parseAmount(loan.annual_rate || loan.rate);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  const formatDaysUntil = (days: number | undefined) => {
    if (days === undefined) return null;
    if (days < 0) return `${Math.abs(days)}d po`;
    if (days === 0) return 'Dnes';
    if (days === 1) return 'Zajtra';
    return `${days}d`;
  };

  const getDaysUntilColor = (days: number | undefined) => {
    if (days === undefined) return colors.textMuted;
    if (days < 0) return colors.danger;
    if (days === 0) return colors.warning;
    if (days <= 3) return colors.warning;
    return colors.success;
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
        ]}
      >
      {/* Status Indicator */}
      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />

      {/* Content */}
      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.titleSection}>
            {status === 'overdue' && (
              <AlertTriangle
                size={16}
                color={colors.danger}
                style={styles.statusIcon}
              />
            )}
            {status === 'due_soon' && (
              <Clock
                size={16}
                color={colors.warning}
                style={styles.statusIcon}
              />
            )}
            <Text
              style={[styles.loanName, { color: colors.text }]}
              numberOfLines={1}
            >
              {loan.name || loan.lender}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </View>

        {/* Subtitle with loan type and rate */}
        <View style={styles.subtitleRow}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {loan.name ? loan.lender : ''}
            {loan.name && loan.lender ? ' • ' : ''}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: colors.surfacePressed }]}>
            <loanTypeConfig.icon size={12} color={colors.textSecondary} />
            <Text style={[styles.typeText, { color: colors.textSecondary }]}>
              {loanTypeConfig.shortLabel}
            </Text>
          </View>
          <View style={[styles.rateBadge, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.rateText, { color: colors.primary }]}>
              {annualRate.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Balance and Monthly Payment Row */}
        <View style={styles.balanceRow}>
          <View>
            <Text style={[styles.balanceAmount, { color: colors.text }]}>
              {formatCurrency(loan.remaining_balance)}
            </Text>
            <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
              zostatok
            </Text>
          </View>
          <View style={styles.monthlyPaymentBox}>
            <Text style={[styles.monthlyAmount, { color: colors.textSecondary }]}>
              {formatCurrency(loan.monthly_payment)}/mes
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View
            style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor:
                    status === 'paid_off' ? colors.success : statusColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            {Math.round(progress)}%
          </Text>
        </View>

        {/* Info Row: Next payment date + Remaining installments */}
        <View style={styles.infoRow}>
          {/* Next payment date */}
          {nextDueDate && status !== 'paid_off' && (
            <View style={styles.infoItem}>
              <Calendar size={12} color={getDaysUntilColor(daysUntil)} />
              <Text
                style={[
                  styles.infoText,
                  { color: getDaysUntilColor(daysUntil) },
                ]}
              >
                {formatDaysUntil(daysUntil) || new Date(nextDueDate).toLocaleDateString('sk-SK', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          )}

          {/* Remaining installments */}
          {remainingInstallments > 0 && status !== 'paid_off' && (
            <View style={styles.infoItem}>
              <Hash size={12} color={colors.textMuted} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>
                {remainingInstallments} spl.
              </Text>
            </View>
          )}

          {/* Due soon indicator */}
          {status === 'paid_off' && (
            <View style={[styles.paidBadge, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.paidText, { color: colors.success }]}>
                ✓ Splatený
              </Text>
            </View>
          )}
        </View>

        {/* Status Alert or Note Preview */}
        <View style={styles.footer}>
          {status === 'overdue' && (
            <View
              style={[
                styles.alertBadge,
                { backgroundColor: colors.dangerLight, borderColor: colors.danger },
              ]}
            >
              <AlertTriangle size={12} color={colors.danger} />
              <Text style={[styles.alertText, { color: colors.danger }]}>
                {loan.overdue_count}{' '}
                {loan.overdue_count === 1 ? 'splatka' : 'splatok'} po splatnosti
              </Text>
            </View>
          )}

          {status === 'due_soon' && daysUntil !== undefined && daysUntil >= 0 && daysUntil <= 5 && (
            <View
              style={[
                styles.alertBadge,
                { backgroundColor: colors.warningLight, borderColor: colors.warning },
              ]}
            >
              <Clock size={12} color={colors.warning} />
              <Text style={[styles.alertText, { color: colors.warning }]}>
                Splatnost {daysUntil === 0 ? 'dnes' : daysUntil === 1 ? 'zajtra' : `za ${daysUntil} dni`}
              </Text>
            </View>
          )}

          {/* Pinned Note Preview */}
          {pinnedNote && status !== 'overdue' && status !== 'due_soon' && (
            <View
              style={[
                styles.noteBadge,
                {
                  backgroundColor:
                    pinnedNote.priority === 'high'
                      ? colors.dangerLight
                      : colors.surfacePressed,
                  borderColor:
                    pinnedNote.priority === 'high'
                      ? colors.danger
                      : colors.border,
                },
              ]}
            >
              <Pin
                size={12}
                color={
                  pinnedNote.priority === 'high'
                    ? colors.danger
                    : colors.textSecondary
                }
              />
              <Text
                style={[
                  styles.noteText,
                  {
                    color:
                      pinnedNote.priority === 'high'
                        ? colors.danger
                        : colors.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {pinnedNote.content}
              </Text>
            </View>
          )}
        </View>
      </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  statusIcon: {
    marginRight: 6,
  },
  loanName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  subtitle: {
    fontSize: 13,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  rateBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rateText: {
    fontSize: 10,
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  balanceAmount: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  monthlyPaymentBox: {
    alignItems: 'flex-end',
  },
  monthlyAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  paidBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    flex: 1,
    maxWidth: '100%',
  },
  noteText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
