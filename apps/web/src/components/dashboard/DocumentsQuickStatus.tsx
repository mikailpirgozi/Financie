'use client';

import { FileText } from 'lucide-react';
import { QuickStatusCard } from './QuickStatusCard';

interface ExpiringDocument {
  type: string;
  date: string;
  daysUntil: number;
}

interface DocumentsQuickStatusProps {
  totalCount: number;
  expiringCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  unpaidFinesCount: number;
  unpaidFinesTotal: number;
  nearestExpiring: ExpiringDocument | null;
  className?: string;
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
  totalCount,
  expiringCount,
  expiredCount,
  expiringSoonCount,
  unpaidFinesCount,
  unpaidFinesTotal,
  nearestExpiring,
  className,
}: DocumentsQuickStatusProps): React.JSX.Element {
  const hasExpired = expiredCount > 0;
  const hasWarnings = expiringCount > 0 || unpaidFinesCount > 0;

  // Badge shows danger for expired, warning for expiring soon
  const badge = hasWarnings
    ? {
        text: hasExpired 
          ? `${expiredCount} expir.`
          : `${expiringCount + unpaidFinesCount} upozor.`,
        variant: hasExpired ? 'danger' as const : 'warning' as const,
      }
    : undefined;

  const metrics = [
    {
      label: hasExpired ? 'Expirované' : 'Končiacich do 30 dní',
      value: hasExpired ? expiredCount.toString() : expiringSoonCount.toString(),
      color: hasExpired ? 'danger' as const : (expiringSoonCount > 0 ? 'warning' as const : 'default' as const),
    },
    {
      label: 'Nezaplatené pokuty',
      value: unpaidFinesCount > 0 ? formatCurrency(unpaidFinesTotal) : '0',
      color: unpaidFinesCount > 0 ? 'danger' as const : 'muted' as const,
    },
  ];

  // Footer shows the most urgent issue
  let footer;
  if (nearestExpiring) {
    const isExpired = nearestExpiring.daysUntil < 0;
    footer = {
      label: isExpired 
        ? `${getDocumentTypeLabel(nearestExpiring.type)} expiroval`
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
      icon={<FileText className="h-5 w-5 text-primary" />}
      mainValue={totalCount.toString()}
      mainLabel="Celkom dokumentov"
      badge={badge}
      metrics={metrics}
      footer={footer}
      href="/dashboard/documents"
      className={className}
    />
  );
}
