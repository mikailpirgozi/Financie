import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LoanCalculatorResult } from '@finapp/core';
import { formatLocaleNumber } from '@finapp/core';
import { useTheme } from '../../contexts';

interface LoanPreviewCardProps {
  result: LoanCalculatorResult | null;
  principal: number;
}

const euro = (n: number) =>
  `${formatLocaleNumber(n, { locale: 'sk-SK', minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

/**
 * Preview card showing calculated loan details (mobile, theme-aware).
 */
export const LoanPreviewCard = memo(function LoanPreviewCard({
  result,
  principal,
}: LoanPreviewCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  if (!result) {
    return (
      <View
        style={[
          styles.emptyContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Zadajte parametre úveru{'\n'}pre zobrazenie prepočtu
        </Text>
      </View>
    );
  }

  const { firstPayment, effectiveRate, totalPayment, totalInterest, totalFees, endDate } = result;
  const rateWarning = Math.abs(effectiveRate - (result.calculatedRate ?? effectiveRate)) > 0.5;

  const safeEndDate = endDate instanceof Date && !isNaN(endDate.getTime()) ? endDate : new Date();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.textMuted }]}>💳 PREHĽAD ÚVERU</Text>

      {/* Main payment */}
      <View style={styles.mainPayment}>
        <Text style={[styles.paymentAmount, { color: colors.primary }]}>{euro(firstPayment)}</Text>
        <Text style={[styles.paymentLabel, { color: colors.textMuted }]}>/mesiac</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Key metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            RPMN {rateWarning && '⚠️'}
          </Text>
          <Text style={[styles.metricValueAccent, { color: colors.warning }]}>
            {effectiveRate.toFixed(2)}%
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Koniec</Text>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {safeEndDate.toLocaleDateString('sk-SK', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Celkom:</Text>
          <Text style={[styles.totalValue, { color: colors.text }]}>{euro(totalPayment)}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Úver:</Text>
          <Text style={[styles.breakdownValue, { color: colors.textSecondary }]}>
            {euro(principal)}
          </Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Úrok:</Text>
          <Text style={[styles.breakdownValueAccent, { color: colors.warning }]}>
            {euro(totalInterest)} ({((totalInterest / principal) * 100).toFixed(0)}%)
          </Text>
        </View>
        {totalFees > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Poplatky:</Text>
            <Text style={[styles.breakdownValueAccent, { color: colors.warning }]}>
              {euro(totalFees)}
            </Text>
          </View>
        )}
      </View>

      {rateWarning && (
        <View style={[styles.warning, { backgroundColor: colors.warningLight ?? colors.surface }]}>
          <Text style={[styles.warningText, { color: colors.warning }]}>
            ⚠️ RPMN je vyššie ako úrok kvôli poplatkom
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  mainPayment: {
    alignItems: 'center',
    marginBottom: 20,
  },
  paymentAmount: {
    fontSize: 36,
    fontWeight: '800',
  },
  paymentLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricValueAccent: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalsSection: {
    gap: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
  },
  breakdownLabel: {
    fontSize: 12,
  },
  breakdownValue: {
    fontSize: 13,
  },
  breakdownValueAccent: {
    fontSize: 13,
  },
  warning: {
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 11,
  },
});
