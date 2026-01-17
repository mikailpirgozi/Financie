import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Wallet } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface FinanceSummaryCollapsedProps {
  netWorth: number;
  netWorthChange: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  month: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function FinanceSummaryCollapsed({
  netWorth,
  netWorthChange,
  totalIncome,
  totalExpenses,
  netCashFlow,
  month,
}: FinanceSummaryCollapsedProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [expanded, setExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = expanded ? 0 : 1;
    Animated.spring(animatedHeight, {
      toValue,
      useNativeDriver: false,
      friction: 10,
    }).start();
    setExpanded(!expanded);
  };

  const expandedHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const isPositiveChange = netWorthChange > 0;
  const isPositiveCashFlow = netCashFlow > 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      {/* Header - Always Visible */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <Wallet size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Čistá hodnota
            </Text>
            <View style={styles.valueRow}>
              <Text style={[styles.mainValue, { color: colors.text }]}>
                {formatCurrency(netWorth)}
              </Text>
              {netWorthChange !== 0 && (
                <View style={styles.changeContainer}>
                  {isPositiveChange ? (
                    <TrendingUp size={14} color={colors.success} />
                  ) : (
                    <TrendingDown size={14} color={colors.danger} />
                  )}
                  <Text
                    style={[
                      styles.changeText,
                      { color: isPositiveChange ? colors.success : colors.danger },
                    ]}
                  >
                    {isPositiveChange ? '+' : ''}
                    {formatCurrency(netWorthChange)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={[styles.expandButton, { backgroundColor: colors.primaryLight }]}>
          {expanded ? (
            <ChevronUp size={18} color={colors.primary} />
          ) : (
            <ChevronDown size={18} color={colors.primary} />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Content */}
      <Animated.View style={[styles.expandedContent, { height: expandedHeight }]}>
        <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
              Príjmy ({month})
            </Text>
            <Text style={[styles.detailValue, { color: colors.income }]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
              Výdavky ({month})
            </Text>
            <Text style={[styles.detailValue, { color: colors.expense }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>Bilancia</Text>
            <Text
              style={[
                styles.detailValue,
                { color: isPositiveCashFlow ? colors.success : colors.danger },
              ]}
            >
              {isPositiveCashFlow ? '+' : ''}
              {formatCurrency(netCashFlow)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    marginTop: 16,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
