import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LoanCalculatorResult } from '@finapp/core';

interface LoanPreviewCardProps {
  result: LoanCalculatorResult | null;
  principal: number;
}

/**
 * Preview card showing calculated loan details (mobile)
 */
export function LoanPreviewCard({ result, principal }: LoanPreviewCardProps) {
  if (!result) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>
          Zadajte parametre úveru{'\n'}pre zobrazenie prepočtu
        </Text>
      </View>
    );
  }

  const { firstPayment, effectiveRate, totalPayment, totalInterest, totalFees, endDate } =
    result;
  const rateWarning = Math.abs(effectiveRate - (result.calculatedRate ?? effectiveRate)) > 0.5;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>💳 PREHĽAD ÚVERU</Text>

      {/* Main payment */}
      <View style={styles.mainPayment}>
        <Text style={styles.paymentAmount}>{firstPayment.toFixed(2)} €</Text>
        <Text style={styles.paymentLabel}>/mesiac</Text>
      </View>

      <View style={styles.divider} />

      {/* Key metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>
            RPMN {rateWarning && '⚠️'}
          </Text>
          <Text style={styles.metricValueOrange}>{effectiveRate.toFixed(2)}%</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Koniec</Text>
          <Text style={styles.metricValue}>
            {endDate.toLocaleDateString('sk-SK', { month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Celkom:</Text>
          <Text style={styles.totalValue}>{totalPayment.toFixed(2)} €</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Úver:</Text>
          <Text style={styles.breakdownValue}>{principal.toFixed(2)} €</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Úrok:</Text>
          <Text style={styles.breakdownValueOrange}>
            {totalInterest.toFixed(2)} € ({((totalInterest / principal) * 100).toFixed(0)}%)
          </Text>
        </View>
        {totalFees > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Poplatky:</Text>
            <Text style={styles.breakdownValueOrange}>{totalFees.toFixed(2)} €</Text>
          </View>
        )}
      </View>

      {rateWarning && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            ⚠️ RPMN je vyššie ako úrok kvôli poplatkom
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
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
    color: '#8b5cf6',
  },
  paymentLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
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
    color: '#6b7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  metricValueOrange: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f97316',
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
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 16,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#6b7280',
  },
  breakdownValueOrange: {
    fontSize: 13,
    color: '#f97316',
  },
  warning: {
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    fontSize: 11,
    color: '#c2410c',
  },
});

