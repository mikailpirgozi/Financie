'use client';

import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface MetricItem {
  label: string;
  value: string;
  color?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
}

interface QuickStatusCardProps {
  title: string;
  icon: React.ReactNode;
  iconBackgroundColor?: string;
  mainValue: string;
  mainLabel: string;
  metrics?: MetricItem[];
  badge?: {
    text: string;
    variant: 'danger' | 'warning' | 'success' | 'info';
  };
  footer?: {
    label: string;
    value: string;
    highlight?: boolean;
  };
  href: string;
  className?: string;
}

const BADGE_STYLES = {
  danger: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
  warning: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400',
  success: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',
  info: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
};

const METRIC_COLORS = {
  default: 'text-foreground',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-orange-600 dark:text-orange-400',
  danger: 'text-red-600 dark:text-red-400',
  muted: 'text-muted-foreground',
};

export function QuickStatusCard({
  title,
  icon,
  iconBackgroundColor = 'bg-primary/10',
  mainValue,
  mainLabel,
  metrics = [],
  badge,
  footer,
  href,
  className,
}: QuickStatusCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'block rounded-2xl border bg-card p-4 shadow-sm transition-all',
        'hover:shadow-md hover:border-primary/30 hover:scale-[1.01]',
        'active:scale-[0.99]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              iconBackgroundColor
            )}
          >
            {icon}
          </div>
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        {badge && (
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-xs font-semibold',
              BADGE_STYLES[badge.variant]
            )}
          >
            {badge.text}
          </span>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <div className="text-3xl font-bold tracking-tight text-foreground">
          {mainValue}
        </div>
        <div className="text-sm text-muted-foreground">{mainLabel}</div>
      </div>

      {/* Metrics */}
      {metrics.length > 0 && (
        <div className="flex border-t pt-3 mb-3">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className={cn(
                'flex-1 px-1',
                index < metrics.length - 1 && 'border-r'
              )}
            >
              <div
                className={cn(
                  'text-sm font-semibold truncate',
                  METRIC_COLORS[metric.color || 'default']
                )}
              >
                {metric.value}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {metric.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {footer && (
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-sm text-muted-foreground truncate flex-1">
            {footer.label}
          </span>
          <div className="flex items-center gap-1">
            <span
              className={cn(
                'text-sm font-semibold',
                footer.highlight ? 'text-primary' : 'text-foreground'
              )}
            >
              {footer.value}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      )}
    </Link>
  );
}
