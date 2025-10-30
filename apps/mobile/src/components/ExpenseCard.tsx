import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Expense } from '../lib/api';

interface ExpenseCardProps {
  expense: Expense;
  onPress?: () => void;
}

export function ExpenseCard({ expense, onPress }: ExpenseCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sk-SK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.merchant}>{expense.merchant || 'Výdavok'}</Text>
        <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.date}>{formatDate(expense.date)}</Text>
        {expense.note && <Text style={styles.note} numberOfLines={1}>{expense.note}</Text>}
      </View>
    </CardWrapper>
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
    marginBottom: 8,
  },
  merchant: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ef4444',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    color: '#6b7280',
  },
  note: {
    fontSize: 12,
    color: '#9ca3af',
    flex: 1,
    marginLeft: 8,
  },
});

