import React from 'react';
import { FileText } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { QuickStatusCard } from './QuickStatusCard';

interface ExpiringDocument {
  type: string;
  date: string;
  daysUntil: number;
}

interface DocumentsQuickStatusProps {
  expiringCount: number; // Total needing attention (expired + expiring soon)
  expiredCount?: number;
  expiringSoonCount?: number;
  unpaidFinesCount: number;
  unpaidFinesTotal: number;
  nearestExpiring: ExpiringDocument | null;
  totalDocuments: number;
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

function getDocumentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    stk: 'STK',
    ek: 'EK',
    vignette: 'Známka',
    insurance: 'Poistka',
  };
  return labels[type] || type;
}

export function DocumentsQuickStatus({
  expiringCount,
  expiredCount = 0,
  expiringSoonCount = 0,
  unpaidFinesCount,
  unpaidFinesTotal,
  nearestExpiring,
  totalDocuments,
  onPress,
}: DocumentsQuickStatusProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const hasExpired = expiredCount > 0;
  const hasWarnings = expiringCount > 0 || unpaidFinesCount > 0;

  // Badge shows danger for expired, warning for expiring soon
  const badge = hasWarnings
    ? {
        text: hasExpired 
          ? `${expiredCount} expirovan${expiredCount === 1 ? 'ý' : 'é'}!`
          : `${expiringCount + unpaidFinesCount} upozornení`,
        color: hasExpired ? colors.danger : colors.warning,
        backgroundColor: hasExpired ? colors.dangerLight : colors.warningLight,
      }
    : undefined;

  const metrics = [
    {
      label: hasExpired ? 'Expirované dokumenty' : 'Končiacich do 30 dní',
      value: hasExpired ? expiredCount.toString() : expiringSoonCount.toString(),
      color: hasExpired ? colors.danger : (expiringSoonCount > 0 ? colors.warning : colors.text),
    },
    {
      label: 'Nezaplatené pokuty',
      value: unpaidFinesCount > 0 ? formatCurrency(unpaidFinesTotal) : '0',
      color: unpaidFinesCount > 0 ? colors.danger : colors.text,
    },
  ];

  // Footer shows the most urgent issue
  let footer;
  if (nearestExpiring) {
    const isExpired = nearestExpiring.daysUntil < 0;
    footer = {
      label: isExpired 
        ? `${getDocumentTypeLabel(nearestExpiring.type)} expiroval${nearestExpiring.type === 'insurance' ? 'a' : ''}`
        : `${getDocumentTypeLabel(nearestExpiring.type)} končí`,
      value: isExpired 
        ? `pred ${Math.abs(nearestExpiring.daysUntil)} dňami`
        : formatDate(nearestExpiring.date),
      highlight: true,
    };
  } else {
    footer = {
      label: 'Všetky dokumenty v poriadku',
      value: '',
      highlight: false,
    };
  }

  return (
    <QuickStatusCard
      title="Dokumenty"
      icon={<FileText size={20} color={colors.primary} />}
      mainValue={totalDocuments.toString()}
      mainLabel="Celkom dokumentov"
      badge={badge}
      metrics={metrics}
      footer={footer}
      onPress={onPress}
    />
  );
}
