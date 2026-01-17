import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import {
  TrendingUp,
  Banknote,
  ArrowDownRight,
  ArrowUpRight,
  Info,
} from 'lucide-react-native';
import { useTheme } from '../../contexts';

interface LoanFinancialOverviewProps {
  principal: number;
  totalInterest: number;
  totalFees: number;
  paidPrincipal: number;
  paidInterest: number;
  remainingPrincipal: number;
  remainingInterest: number;
  effectiveRate?: number; // RPMN
  monthlyPayment: number;
  savingsOnEarlyRepayment?: number;
}

export function LoanFinancialOverview({
  principal,
  totalInterest,
  totalFees,
  paidPrincipal,
  paidInterest,
  remainingPrincipal,
  remainingInterest,
  effectiveRate,
  monthlyPayment,
  savingsOnEarlyRepayment,
}: LoanFinancialOverviewProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Animation
  const progressPrincipal = useRef(new Animated.Value(0)).current;
  const progressInterest = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const principalPercent = principal > 0 ? (paidPrincipal / principal) * 100 : 0;
    const interestPercent = totalInterest > 0 ? (paidInterest / totalInterest) * 100 : 0;

    Animated.parallel([
      Animated.spring(progressPrincipal, {
        toValue: principalPercent,
        useNativeDriver: false,
      }),
      Animated.spring(progressInterest, {
        toValue: interestPercent,
        useNativeDriver: false,
      }),
    ]).start();
  }, [paidPrincipal, paidInterest, principal, totalInterest]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const totalCost = principal + totalInterest + totalFees;
  const interestPercentage = principal > 0 ? (totalInterest / principal) * 100 : 0;
  const principalPaidPercent = principal > 0 ? (paidPrincipal / principal) * 100 : 0;
  const interestPaidPercent = totalInterest > 0 ? (paidInterest / totalInterest) * 100 : 0;

  return (
    <View style={styles.container}>
      {/* Total Cost Breakdown */}
      <View style={[styles.section, { backgroundColor: colors.surfacePressed }]}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Celkova cena uveru
        </Text>
        <Text style={[styles.totalCost, { color: colors.text }]}>
          {formatCurrency(totalCost)}
        </Text>

        <View style={styles.breakdownList}>
          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                Istina (pozicane)
              </Text>
            </View>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {formatCurrency(principal)}
            </Text>
          </View>

          <View style={styles.breakdownItem}>
            <View style={styles.breakdownLeft}>
              <View style={[styles.dot, { backgroundColor: colors.warning }]} />
              <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                Uroky celkom
              </Text>
            </View>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {formatCurrency(totalInterest)}
            </Text>
          </View>

          {totalFees > 0 && (
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
                  Poplatky
                </Text>
              </View>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>
                {formatCurrency(totalFees)}
              </Text>
            </View>
          )}
        </View>

        {/* Interest percentage info */}
        <View style={[styles.infoBox, { backgroundColor: colors.warningLight }]}>
          <Info size={14} color={colors.warning} />
          <Text style={[styles.infoText, { color: colors.warning }]}>
            Uroky tvoria {interestPercentage.toFixed(1)}% z pozicianej sumy
          </Text>
        </View>
      </View>

      {/* Principal Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View style={styles.progressLeft}>
            <Banknote size={16} color={colors.primary} />
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Istina
            </Text>
          </View>
          <Text style={[styles.progressPercent, { color: colors.primary }]}>
            {principalPaidPercent.toFixed(0)}%
          </Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary },
              {
                width: progressPrincipal.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <View style={styles.progressStats}>
          <View style={styles.progressStatItem}>
            <ArrowDownRight size={12} color={colors.success} />
            <Text style={[styles.progressStatLabel, { color: colors.textMuted }]}>
              Zaplatene
            </Text>
            <Text style={[styles.progressStatValue, { color: colors.success }]}>
              {formatCurrency(paidPrincipal)}
            </Text>
          </View>
          <View style={styles.progressStatItem}>
            <ArrowUpRight size={12} color={colors.textSecondary} />
            <Text style={[styles.progressStatLabel, { color: colors.textMuted }]}>
              Zostava
            </Text>
            <Text style={[styles.progressStatValue, { color: colors.text }]}>
              {formatCurrency(remainingPrincipal)}
            </Text>
          </View>
        </View>
      </View>

      {/* Interest Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <View style={styles.progressLeft}>
            <TrendingUp size={16} color={colors.warning} />
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Uroky
            </Text>
          </View>
          <Text style={[styles.progressPercent, { color: colors.warning }]}>
            {interestPaidPercent.toFixed(0)}%
          </Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
          <Animated.View
            style={[
              styles.progressFill,
              { backgroundColor: colors.warning },
              {
                width: progressInterest.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>

        <View style={styles.progressStats}>
          <View style={styles.progressStatItem}>
            <ArrowDownRight size={12} color={colors.success} />
            <Text style={[styles.progressStatLabel, { color: colors.textMuted }]}>
              Zaplatene
            </Text>
            <Text style={[styles.progressStatValue, { color: colors.success }]}>
              {formatCurrency(paidInterest)}
            </Text>
          </View>
          <View style={styles.progressStatItem}>
            <ArrowUpRight size={12} color={colors.textSecondary} />
            <Text style={[styles.progressStatLabel, { color: colors.textMuted }]}>
              Zostava
            </Text>
            <Text style={[styles.progressStatValue, { color: colors.text }]}>
              {formatCurrency(remainingInterest)}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
        {effectiveRate !== undefined && effectiveRate > 0 && (
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: colors.primary }]}>
              {effectiveRate.toFixed(2)}%
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
              RPMN
            </Text>
          </View>
        )}

        <View style={styles.quickStatItem}>
          <Text style={[styles.quickStatValue, { color: colors.text }]}>
            {formatCurrency(monthlyPayment)}
          </Text>
          <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
            Mesacna splatka
          </Text>
        </View>

        {savingsOnEarlyRepayment !== undefined && savingsOnEarlyRepayment > 0 && (
          <View style={styles.quickStatItem}>
            <Text style={[styles.quickStatValue, { color: colors.success }]}>
              {formatCurrency(savingsOnEarlyRepayment)}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>
              Uspora pri predcasnom
            </Text>
          </View>
        )}
      </View>

      {/* Visual Ratio Bar */}
      <View style={styles.ratioSection}>
        <Text style={[styles.ratioTitle, { color: colors.textMuted }]}>
          Pomer istina vs uroky
        </Text>
        <View style={styles.ratioBar}>
          <View
            style={[
              styles.ratioPrincipal,
              {
                backgroundColor: colors.primary,
                flex: principal / (principal + totalInterest),
              },
            ]}
          >
            <Text style={styles.ratioText}>
              {((principal / (principal + totalInterest)) * 100).toFixed(0)}%
            </Text>
          </View>
          <View
            style={[
              styles.ratioInterest,
              {
                backgroundColor: colors.warning,
                flex: totalInterest / (principal + totalInterest),
              },
            ]}
          >
            {totalInterest / (principal + totalInterest) > 0.1 && (
              <Text style={styles.ratioText}>
                {((totalInterest / (principal + totalInterest)) * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        </View>
        <View style={styles.ratioLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Istina</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Uroky</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No border/bg - used inside CollapsibleSection
    paddingTop: 8,
  },
  section: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  totalCost: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  breakdownList: {
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressStatLabel: {
    fontSize: 11,
  },
  progressStatValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    marginBottom: 16,
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickStatLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  ratioSection: {
    marginTop: 8,
  },
  ratioTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  ratioBar: {
    flexDirection: 'row',
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
  },
  ratioPrincipal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratioInterest: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratioText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  ratioLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
  },
});
