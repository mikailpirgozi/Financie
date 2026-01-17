import React, { useEffect, ReactNode, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { useTheme } from '../../contexts';

interface HeroCardProps {
  children: ReactNode;
  style?: ViewStyle;
  animated?: boolean;
}

export function HeroCard({ children, style, animated = true }: HeroCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const scale = useRef(new Animated.Value(animated ? 0.95 : 1)).current;
  const opacity = useRef(new Animated.Value(animated ? 0 : 1)).current;

  useEffect(() => {
    if (animated) {
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
    }
  }, [animated]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
        },
        style,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface HeroBalanceProps {
  label: string;
  amount: number | string;
  formatCurrency?: (amount: number) => string;
}

export function HeroBalance({ label, amount, formatCurrency }: HeroBalanceProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const defaultFormat = (amt: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const formatter = formatCurrency || defaultFormat;
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formattedAmount = isNaN(numericAmount) ? '0 €' : formatter(numericAmount);

  return (
    <View style={styles.balanceSection}>
      <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.balanceAmount, { color: colors.text }]}>
        {formattedAmount}
      </Text>
    </View>
  );
}

interface HeroProgressProps {
  label: string;
  progress: number; // 0-100
  color?: string;
}

export function HeroProgress({ label, progress, color }: HeroProgressProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const progressColor = color || colors.primary;

  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progressWidth, {
      toValue: Math.min(Math.max(progress, 0), 100),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.progressSection}>
      <View style={styles.progressLabels}>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.progressValue, { color: progressColor }]}>
          {Math.round(progress)}%
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
        <Animated.View
          style={[
            styles.progressFill,
            { backgroundColor: progressColor },
            {
              width: progressWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
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
  progressSection: {
    marginTop: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
