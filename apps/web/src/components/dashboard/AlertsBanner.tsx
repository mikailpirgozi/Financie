'use client';

import { AlertTriangle, FileWarning, Receipt, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export interface AlertItem {
  type: 'overdue_loans' | 'expired_docs' | 'expiring_docs' | 'unpaid_fines';
  count: number;
  message: string;
  href: string;
}

interface AlertsBannerProps {
  alerts: AlertItem[];
}

const ALERT_CONFIG: Record<AlertItem['type'], { 
  icon: typeof AlertTriangle; 
  priority: number;
  variant: 'danger' | 'warning' | 'info';
}> = {
  overdue_loans: {
    icon: AlertTriangle,
    priority: 1,
    variant: 'danger',
  },
  expired_docs: {
    icon: FileWarning,
    priority: 2,
    variant: 'danger',
  },
  expiring_docs: {
    icon: FileWarning,
    priority: 3,
    variant: 'warning',
  },
  unpaid_fines: {
    icon: Receipt,
    priority: 4,
    variant: 'info',
  },
};

const VARIANT_STYLES = {
  danger: {
    container: 'bg-red-50 dark:bg-red-950/30 border-l-red-500',
    text: 'text-red-700 dark:text-red-400',
    icon: 'text-red-600 dark:text-red-400',
  },
  warning: {
    container: 'bg-orange-50 dark:bg-orange-950/30 border-l-orange-500',
    text: 'text-orange-700 dark:text-orange-400',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-950/30 border-l-blue-500',
    text: 'text-blue-700 dark:text-blue-400',
    icon: 'text-blue-600 dark:text-blue-400',
  },
};

export function AlertsBanner({ alerts }: AlertsBannerProps): React.JSX.Element | null {
  // Filter alerts with count > 0 and sort by priority
  const activeAlerts = alerts
    .filter(alert => alert.count > 0)
    .sort((a, b) => ALERT_CONFIG[a.type].priority - ALERT_CONFIG[b.type].priority);

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 mb-6">
      {activeAlerts.map((alert) => {
        const config = ALERT_CONFIG[alert.type];
        const styles = VARIANT_STYLES[config.variant];
        const IconComponent = config.icon;

        return (
          <Link
            key={alert.type}
            href={alert.href}
            className={cn(
              'flex items-center justify-between p-3.5 rounded-xl border-l-4 transition-all',
              'hover:shadow-md hover:scale-[1.01] active:scale-[0.99]',
              styles.container
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <IconComponent className={cn('h-5 w-5 shrink-0', styles.icon)} />
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn('text-lg font-bold', styles.text)}>
                  {alert.count}
                </span>
                <span className={cn('text-sm font-medium truncate', styles.text)}>
                  {alert.message}
                </span>
              </div>
            </div>
            <ChevronRight className={cn('h-5 w-5 shrink-0', styles.icon)} />
          </Link>
        );
      })}
    </div>
  );
}
