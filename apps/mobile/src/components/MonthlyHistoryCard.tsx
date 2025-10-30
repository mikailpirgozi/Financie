import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { MonthlyDashboardData } from '../lib/api';

interface MonthlyHistoryCardProps {
  data: MonthlyDashboardData;
  onPress?: () => void;
}

export function MonthlyHistoryCard({ data, onPress }: MonthlyHistoryCardProps) {
  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const monthNames = [
      'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
      'Júl', 'August', 'September', 'Október', 'November', 'December'
    ];
    return `${monthNames[parseInt(monthNum, 10) - 1]} ${year}`;
  };

  const netWorthChange = parseFloat(data.netWorthChange);
  const isPositive = netWorthChange > 0;

  const CardContent = (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.month}>{formatMonth(data.month)}</Text>
        <Text style={styles.netWorth}>{formatCurrency(data.netWorth)}</Text>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Príjmy:</Text>
          <Text style={[styles.detailValue, styles.income]}>
            {formatCurrency(data.totalIncome)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Výdaje:</Text>
          <Text style={[styles.detailValue, styles.expense]}>
            {formatCurrency(data.totalExpenses)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Bilancia:</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(data.netCashFlow)}
          </Text>
        </View>
      </View>

      {netWorthChange !== 0 && (
        <View style={styles.changeContainer}>
          <Text
            style={[
              styles.change,
              isPositive ? styles.changePositive : styles.changeNegative,
            ]}
          >
            {isPositive ? '↑' : '↓'} {formatCurrency(Math.abs(netWorthChange).toString())}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  month: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  netWorth: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0070f3',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  income: {
    color: '#10b981',
  },
  expense: {
    color: '#ef4444',
  },
  changeContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  change: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  changePositive: {
    color: '#10b981',
  },
  changeNegative: {
    color: '#ef4444',
  },
});

