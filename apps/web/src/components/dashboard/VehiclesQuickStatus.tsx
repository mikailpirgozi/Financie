'use client';

import { Car } from 'lucide-react';
import { QuickStatusCard } from './QuickStatusCard';

interface VehiclesQuickStatusProps {
  totalCount: number;
  totalValue: number;
  loanBalance: number;
  expiringDocsCount: number;
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

export function VehiclesQuickStatus({
  totalCount,
  totalValue,
  loanBalance,
  expiringDocsCount,
  className,
}: VehiclesQuickStatusProps): React.JSX.Element {
  const badge = expiringDocsCount > 0
    ? {
        text: `${expiringDocsCount} s konč. dok.`,
        variant: 'warning' as const,
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
      color: loanBalance > 0 ? 'danger' as const : 'muted' as const,
    },
  ];

  const equity = totalValue - loanBalance;
  const footer = {
    label: 'Čistá hodnota vozidiel',
    value: formatCurrency(equity),
    highlight: equity > 0,
  };

  const vehicleLabel = totalCount === 1 
    ? 'Vozidlo' 
    : totalCount < 5 
      ? 'Vozidlá' 
      : 'Vozidiel';

  return (
    <QuickStatusCard
      title="Vozidlá"
      icon={<Car className="h-5 w-5 text-primary" />}
      mainValue={totalCount.toString()}
      mainLabel={vehicleLabel}
      badge={badge}
      metrics={metrics}
      footer={footer}
      href="/dashboard/vehicles"
      className={className}
    />
  );
}
