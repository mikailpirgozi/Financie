import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { QuickStatusCard } from './QuickStatusCard';

interface NextPayment {
  date: string;
  amount: number;
  lender: string;
  daysUntil: number;
}

interface LoansQuickStatusProps {
  totalDebt: number;
  activeCount: number;
  overdueCount: number;
  nextPayment: NextPayment | null;
  totalProgress: number;
  onPress: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'short',
  });
}

export function LoansQuickStatus({
  totalDebt,
  activeCount,
  overdueCount,
  nextPayment,
  totalProgress,
  onPress,
}: LoansQuickStatusProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const badge = overdueCount > 0
    ? {
        text: `${overdueCount} omeškaných`,
        color: colors.danger,
        backgroundColor: colors.dangerLight,
      }
    : undefined;

  const metrics = [
    {
      label: 'Aktívne úvery',
      value: activeCount.toString(),
    },
    {
      label: 'Splatené',
      value: `${totalProgress.toFixed(0)}%`,
      color: colors.success,
    },
  ];

  const footer = nextPayment
    ? {
        label: `Najbližšia splátka (${formatDate(nextPayment.date)})`,
        value: formatCurrency(nextPayment.amount),
        highlight: nextPayment.daysUntil <= 5,
      }
    : undefined;

  return (
    <View>
      <QuickStatusCard
        title="Úvery"
        icon={<Wallet size={20} color={colors.primary} />}
        mainValue={formatCurrency(totalDebt)}
        mainLabel="Zostávajúci dlh"
        badge={badge}
        metrics={metrics}
        footer={footer}
        onPress={onPress}
      />
      {/* Progress Bar */}
      {totalProgress > 0 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
            <View
              style={[
                styles.progressBar,
                {
                  backgroundColor: colors.success,
                  width: `${Math.min(totalProgress, 100)}%`,
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
