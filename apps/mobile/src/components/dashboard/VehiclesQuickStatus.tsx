import React from 'react';
import { Car } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { QuickStatusCard } from './QuickStatusCard';

interface VehiclesQuickStatusProps {
  totalCount: number;
  totalValue: number;
  loanBalance: number;
  expiringDocsCount: number;
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

export function VehiclesQuickStatus({
  totalCount,
  totalValue,
  loanBalance,
  expiringDocsCount,
  onPress,
}: VehiclesQuickStatusProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const badge = expiringDocsCount > 0
    ? {
        text: `${expiringDocsCount} s končiacimi dok.`,
        color: colors.warning,
        backgroundColor: colors.warningLight,
      }
    : undefined;

  const metrics = [
    {
      label: 'Celková hodnota',
      value: formatCurrency(totalValue),
    },
    {
      label: 'Úvery na vozidlá',
      value: loanBalance > 0 ? formatCurrency(loanBalance) : '-',
      color: loanBalance > 0 ? colors.danger : colors.textMuted,
    },
  ];

  const equity = totalValue - loanBalance;
  const footer = {
    label: 'Čistá hodnota vozidiel',
    value: formatCurrency(equity),
    highlight: equity > 0,
  };

  return (
    <QuickStatusCard
      title="Vozidlá"
      icon={<Car size={20} color={colors.primary} />}
      mainValue={totalCount.toString()}
      mainLabel={totalCount === 1 ? 'Vozidlo' : totalCount < 5 ? 'Vozidlá' : 'Vozidiel'}
      badge={badge}
      metrics={metrics}
      footer={footer}
      onPress={onPress}
    />
  );
}
