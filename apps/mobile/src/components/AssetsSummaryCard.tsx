import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { MonthlyDashboardData } from '../lib/api';

interface AssetsSummaryCardProps {
  data: MonthlyDashboardData;
}

export function AssetsSummaryCard({ data }: AssetsSummaryCardProps) {
  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const netWorthChange = parseFloat(data.netWorthChange);
  const isPositive = netWorthChange > 0;
  const isNegative = netWorthChange < 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>🏠 Majetok</Text>
      
      <View style={styles.mainSection}>
        <Text style={styles.label}>Celkový majetok</Text>
        <Text style={styles.mainValue}>{formatCurrency(data.totalAssets)}</Text>
      </View>

      <View style={styles.mainSection}>
        <Text style={styles.label}>Zostatok úverov</Text>
        <Text style={styles.secondaryValue}>{formatCurrency(data.loanBalanceRemaining)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.mainSection}>
        <Text style={styles.label}>Čistá hodnota</Text>
        <Text style={styles.netWorthValue}>{formatCurrency(data.netWorth)}</Text>
        {netWorthChange !== 0 && (
          <Text
            style={[
              styles.change,
              isPositive && styles.changePositive,
              isNegative && styles.changeNegative,
            ]}
          >
            {isPositive ? '↑' : '↓'} {formatCurrency(Math.abs(netWorthChange).toString())}
          </Text>
        )}
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
  secondaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  netWorthValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  changePositive: {
    color: '#10b981',
  },
  changeNegative: {
    color: '#ef4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
});

