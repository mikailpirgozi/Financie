import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Loan } from '../lib/api';

interface LoanCardProps {
  loan: Loan;
  onPress: () => void;
}

export function LoanCard({ loan, onPress }: LoanCardProps) {
  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(num);
  };

  const statusColors = {
    active: '#10b981',
    paid_off: '#6b7280',
    defaulted: '#ef4444',
  };

  const statusLabels = {
    active: 'Aktívny',
    paid_off: 'Splatený',
    defaulted: 'Nesplatený',
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.lender}>{loan.lender}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[loan.status] }]}>
          <Text style={styles.statusText}>{statusLabels[loan.status]}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Výška úveru:</Text>
          <Text style={styles.value}>{formatCurrency(loan.principal)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Úroková sadzba:</Text>
          <Text style={styles.value}>{loan.annual_rate}% p.a.</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Doba splácania:</Text>
          <Text style={styles.value}>{loan.term_months} mesiacov</Text>
        </View>
      </View>
    </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lender: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
});

