import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { TrendingDown, TrendingUp, Receipt, Calendar } from 'lucide-react-native';
import { useTheme } from '../../contexts';

interface ExpenseHeroCardProps {
  totalExpenses: number;
  expenseCount: number;
  percentChange?: number | null; // % change from previous period
  periodLabel?: string; // "Tento mesiac", "Minuly mesiac", etc.
}

export function ExpenseHeroCard({
  totalExpenses,
  expenseCount,
  percentChange,
  periodLabel = 'Tento mesiac',
}: ExpenseHeroCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Animation values
  const scale = useRef(new Animated.Value(0.95)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = () => {
    if (percentChange === null || percentChange === undefined) return null;
    // For expenses, going down is positive (less spending)
    if (percentChange < 0) {
      return <TrendingDown size={16} color={colors.success} />;
    }
    return <TrendingUp size={16} color={colors.danger} />;
  };

  const getTrendColor = () => {
    if (percentChange === null || percentChange === undefined) return colors.textMuted;
    return percentChange < 0 ? colors.success : colors.danger;
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
      {/* Period Label */}
      <View style={styles.periodRow}>
        <Calendar size={14} color={colors.textMuted} />
        <Text style={[styles.periodLabel, { color: colors.textMuted }]}>
          {periodLabel}
        </Text>
      </View>

      {/* Main Balance */}
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
          Celkove vydavky
        </Text>
        <Text style={[styles.balanceAmount, { color: colors.expense }]}>
          {formatCurrency(totalExpenses)}
        </Text>

        {/* Trend indicator */}
        {percentChange !== null && percentChange !== undefined && (
          <View style={styles.trendRow}>
            {getTrendIcon()}
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {percentChange > 0 ? '+' : ''}
              {percentChange.toFixed(1)}% oproti minulemu obdobiu
            </Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* Expense Count */}
        <View
          style={[
            styles.statBadge,
            { backgroundColor: colors.expenseLight, borderColor: colors.expense },
          ]}
        >
          <Receipt size={14} color={colors.expense} />
          <Text style={[styles.statText, { color: colors.expense }]}>
            {expenseCount} {expenseCount === 1 ? 'vydavok' : expenseCount < 5 ? 'vydavky' : 'vydavkov'}
          </Text>
        </View>

        {/* Average per expense */}
        {expenseCount > 0 && (
          <View
            style={[
              styles.statBadge,
              { backgroundColor: colors.surfacePressed, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              Ø {formatCurrency(totalExpenses / expenseCount)}
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  periodLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
