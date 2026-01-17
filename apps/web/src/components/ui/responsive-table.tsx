'use client';

import type { JSX, ReactNode } from 'react';
import { cn } from '@finapp/ui';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps): JSX.Element {
  return (
    <div className="w-full overflow-x-auto">
      <div className={cn('min-w-full inline-block align-middle', className)}>
        <div className="overflow-hidden border rounded-lg">
          {children}
        </div>
      </div>
    </div>
  );
}

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps): JSX.Element {
  return (
    <table className={cn('min-w-full divide-y divide-border', className)}>
      {children}
    </table>
  );
}

export function TableHeader({ children, className }: TableProps): JSX.Element {
  return (
    <thead className={cn('bg-muted', className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: TableProps): JSX.Element {
  return (
    <tbody className={cn('divide-y divide-border bg-card', className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className }: TableProps): JSX.Element {
  return (
    <tr className={cn('hover:bg-muted/50 transition-colors', className)}>
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  isHeader?: boolean;
}

export function TableCell({ children, className, isHeader }: TableCellProps): JSX.Element {
  const Component = isHeader ? 'th' : 'td';
  return (
    <Component
      className={cn(
        'px-4 py-3 text-sm',
        isHeader && 'font-medium text-left',
        !isHeader && 'text-foreground',
        className
      )}
    >
      {children}
    </Component>
  );
}

