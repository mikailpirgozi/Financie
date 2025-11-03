import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MonthlyDashboardData } from '../lib/api';

interface LoansSummaryCardProps {
  data: MonthlyDashboardData;
  overdueCount?: number;
  upcomingCount?: number;
}

export function LoansSummaryCard({ data, overdueCount = 0, upcomingCount = 0 }: LoansSummaryCardProps) {
  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🏦 Úvery</Text>
      
      {/* Alert banners */}
      {overdueCount > 0 && (
        <View style={[styles.alertBanner, styles.alertDanger]}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <Text style={styles.alertText}>
            {overdueCount} {overdueCount === 1 ? 'splátka' : 'splátok'} po splatnosti
          </Text>
        </View>
      )}
      {upcomingCount > 0 && (
        <View style={[styles.alertBanner, styles.alertWarning]}>
          <Text style={styles.alertIcon}>📅</Text>
          <Text style={styles.alertText}>
            {upcomingCount} {upcomingCount === 1 ? 'splátka' : 'splátok'} do 5 dní
          </Text>
        </View>
      )}
      
      <View style={styles.mainSection}>
        <Text style={styles.label}>Splatené tento mesiac</Text>
        <Text style={styles.mainValue}>{formatCurrency(data.loanPaymentsTotal)}</Text>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>→ Istina</Text>
          <Text style={styles.detailValue}>{formatCurrency(data.loanPrincipalPaid)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>→ Úrok</Text>
          <Text style={styles.detailValue}>{formatCurrency(data.loanInterestPaid)}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.mainSection}>
        <Text style={styles.label}>Zostávajúci dlh</Text>
        <Text style={styles.mainValue}>{formatCurrency(data.loanBalanceRemaining)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  mainSection: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  mainValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  alertDanger: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  alertWarning: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
});

