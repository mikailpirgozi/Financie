import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { AlertTriangle, CreditCard, Clock } from 'lucide-react-native';
import { useTheme } from '../../contexts';
import { Badge } from '../ui/Badge';

interface CompactHeroCardProps {
  loanName: string;
  lenderName: string;
  status: 'active' | 'paid_off';
  remainingBalance: number;
  principal: number;
  progress: number; // 0-100
  monthlyPayment: number;
  overdueCount: number;
  remainingInstallments: number;
}

export function CompactHeroCard({
  loanName,
  lenderName,
  status,
  remainingBalance,
  principal,
  progress,
  monthlyPayment,
  overdueCount,
  remainingInstallments,
}: CompactHeroCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(progressAnim, {
        toValue: progress,
        useNativeDriver: false,
        friction: 8,
      }),
    ]).start();
  }, [progress]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusLabel = () => {
    if (status === 'paid_off') return 'Splatený';
    return 'Aktívny';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.loanName, { color: colors.text }]} numberOfLines={1}>
            {loanName || lenderName}
          </Text>
          {loanName && (
            <Text style={[styles.lenderName, { color: colors.textMuted }]}>
              {lenderName}
            </Text>
          )}
        </View>
        <Badge variant={status === 'paid_off' ? 'success' : 'default'}>
          {getStatusLabel()}
        </Badge>
      </View>

      {/* Balance */}
      <View style={styles.balanceSection}>
        <View>
          <Text style={[styles.balanceLabel, { color: colors.textMuted }]}>
            Zostáva splatiť
          </Text>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>
            {formatCurrency(remainingBalance)}
          </Text>
        </View>
        <View style={styles.originalSection}>
          <Text style={[styles.originalLabel, { color: colors.textMuted }]}>
            Pôvodná suma
          </Text>
          <Text style={[styles.originalAmount, { color: colors.textSecondary }]}>
            {formatCurrency(principal)}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: status === 'paid_off' ? colors.success : colors.primary,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: colors.textMuted }]}>
          {Math.round(progress)}% splatené
        </Text>
      </View>

      {/* Quick Stats */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          {overdueCount > 0 ? (
            <AlertTriangle size={16} color={colors.danger} />
          ) : (
            <View style={[styles.statDot, { backgroundColor: colors.success }]} />
          )}
          <Text
            style={[
              styles.statValue,
              { color: overdueCount > 0 ? colors.danger : colors.text },
            ]}
          >
            {overdueCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Po splatnosti
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <CreditCard size={16} color={colors.textMuted} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatCurrency(monthlyPayment)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Mesačne
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Clock size={16} color={colors.textMuted} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {remainingInstallments}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Zostáva splátok
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  loanName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  lenderName: {
    fontSize: 14,
    marginTop: 2,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  originalSection: {
    alignItems: 'flex-end',
  },
  originalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  originalAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
});
