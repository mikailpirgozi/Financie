import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import {
  AlertTriangle,
  CheckCircle,
  Wallet,
  Calendar,
  TrendingUp,
  CreditCard,
  Clock,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../contexts';

interface NextPaymentInfo {
  date: string;
  amount: number;
  lender: string;
  loanName?: string;
  daysUntil: number;
  loanId: string;
}

interface LoanHeroCardProps {
  totalBalance: number;
  totalPrincipal: number;
  activeCount: number;
  overdueCount: number;
  paidOffCount: number;
  totalProgress: number; // 0-100
  totalMonthlyPayment: number;
  totalInterestPaid: number;
  totalInterestRemaining: number;
  nextPayment: NextPaymentInfo | null;
  onNextPaymentPress?: () => void;
  onQuickPayPress?: () => void;
}

export function LoanHeroCard({
  totalBalance,
  totalPrincipal,
  activeCount,
  overdueCount,
  paidOffCount,
  totalProgress,
  totalMonthlyPayment,
  totalInterestPaid,
  totalInterestRemaining,
  nextPayment,
  onNextPaymentPress,
  onQuickPayPress,
}: LoanHeroCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Animation values
  const progressWidth = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
    
    Animated.spring(progressWidth, {
      toValue: totalProgress,
      useNativeDriver: false,
    }).start();
  }, [totalProgress]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('sk-SK', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getDaysUntilLabel = (days: number) => {
    if (days < 0) return `${Math.abs(days)} dní po splatnosti`;
    if (days === 0) return 'Dnes';
    if (days === 1) return 'Zajtra';
    if (days <= 7) return `Za ${days} dní`;
    return `Za ${days} dní`;
  };

  const getDaysUntilColor = (days: number) => {
    if (days < 0) return colors.danger;
    if (days === 0) return colors.warning;
    if (days <= 3) return colors.warning;
    return colors.success;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      {/* Main Balance */}
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
          Celkovy zostatok
        </Text>
        <Text style={[styles.balanceAmount, { color: colors.text }]}>
          {formatCurrency(totalBalance)}
        </Text>
        <Text style={[styles.originalAmount, { color: colors.textMuted }]}>
          z {formatCurrency(totalPrincipal)} pozicanych
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
            Celkovy pokrok
          </Text>
          <Text style={[styles.progressValue, { color: colors.primary }]}>
            {Math.round(totalProgress)}%
          </Text>
        </View>
        <View
          style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary },
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Status Badges */}
      <View style={styles.badgesRow}>
        {/* Active loans */}
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.primaryLight, borderColor: colors.primary },
          ]}
        >
          <Wallet size={14} color={colors.primary} />
          <Text style={[styles.badgeText, { color: colors.primary }]}>
            {activeCount} aktivnych
          </Text>
        </View>

        {/* Overdue - only show if > 0 */}
        {overdueCount > 0 && (
          <View
            style={[
              styles.badge,
              styles.badgeDanger,
              { backgroundColor: colors.dangerLight, borderColor: colors.danger },
            ]}
          >
            <AlertTriangle size={14} color={colors.danger} />
            <Text style={[styles.badgeText, { color: colors.danger }]}>
              {overdueCount} po splatnosti
            </Text>
          </View>
        )}

        {/* Paid off - only show if > 0 */}
        {paidOffCount > 0 && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.successLight, borderColor: colors.success },
            ]}
          >
            <CheckCircle size={14} color={colors.success} />
            <Text style={[styles.badgeText, { color: colors.success }]}>
              {paidOffCount} splatenych
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats Row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <CreditCard size={16} color={colors.textMuted} />
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(totalMonthlyPayment)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              mesacne
            </Text>
          </View>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <TrendingUp size={16} color={colors.textMuted} />
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(totalInterestPaid)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              urok zaplateny
            </Text>
          </View>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Clock size={16} color={colors.textMuted} />
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(totalInterestRemaining)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              urok zostava
            </Text>
          </View>
        </View>
      </View>

      {/* Next Payment Section */}
      {nextPayment && (
        <TouchableOpacity
          style={[
            styles.nextPaymentSection,
            {
              backgroundColor: nextPayment.daysUntil < 0 
                ? colors.dangerLight 
                : nextPayment.daysUntil <= 3 
                  ? colors.warningLight 
                  : colors.surfacePressed,
              borderColor: nextPayment.daysUntil < 0
                ? colors.danger
                : nextPayment.daysUntil <= 3
                  ? colors.warning
                  : colors.border,
            },
          ]}
          onPress={onNextPaymentPress}
          activeOpacity={0.7}
        >
          <View style={styles.nextPaymentHeader}>
            <View style={styles.nextPaymentIcon}>
              <Calendar
                size={18}
                color={getDaysUntilColor(nextPayment.daysUntil)}
              />
            </View>
            <View style={styles.nextPaymentInfo}>
              <Text style={[styles.nextPaymentLabel, { color: colors.textSecondary }]}>
                Najblizsie splatka
              </Text>
              <View style={styles.nextPaymentRow}>
                <Text style={[styles.nextPaymentAmount, { color: colors.text }]}>
                  {formatCurrency(nextPayment.amount)}
                </Text>
                <View
                  style={[
                    styles.daysUntilBadge,
                    { backgroundColor: getDaysUntilColor(nextPayment.daysUntil) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.daysUntilText,
                      { color: getDaysUntilColor(nextPayment.daysUntil) },
                    ]}
                  >
                    {getDaysUntilLabel(nextPayment.daysUntil)}
                  </Text>
                </View>
              </View>
              <Text style={[styles.nextPaymentLender, { color: colors.textMuted }]}>
                {nextPayment.loanName || nextPayment.lender} • {formatDate(nextPayment.date)}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>

          {/* Quick Pay Button */}
          {onQuickPayPress && (
            <TouchableOpacity
              style={[styles.quickPayButton, { backgroundColor: colors.primary }]}
              onPress={onQuickPayPress}
              activeOpacity={0.8}
            >
              <CreditCard size={16} color={colors.textInverse} />
              <Text style={[styles.quickPayText, { color: colors.textInverse }]}>
                Zaplatit teraz
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  originalAmount: {
    fontSize: 13,
    marginTop: 4,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  badgeDanger: {
    // Additional styles handled inline
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    marginHorizontal: 8,
    alignSelf: 'stretch',
  },
  nextPaymentSection: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  nextPaymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextPaymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nextPaymentInfo: {
    flex: 1,
  },
  nextPaymentLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  nextPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextPaymentAmount: {
    fontSize: 20,
    fontWeight: '800',
  },
  daysUntilBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  daysUntilText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nextPaymentLender: {
    fontSize: 12,
    marginTop: 2,
  },
  quickPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  quickPayText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
