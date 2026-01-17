import type { JSX, ReactNode } from 'react';
import { cn } from '@finapp/ui';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function ResponsiveGrid({ children, className, cols }: ResponsiveGridProps): JSX.Element {
  const gridClasses = cn(
    'grid gap-4',
    cols?.default && `grid-cols-${cols.default}`,
    cols?.sm && `sm:grid-cols-${cols.sm}`,
    cols?.md && `md:grid-cols-${cols.md}`,
    cols?.lg && `lg:grid-cols-${cols.lg}`,
    cols?.xl && `xl:grid-cols-${cols.xl}`,
    !cols && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    className
  );

  return <div className={gridClasses}>{children}</div>;
}

