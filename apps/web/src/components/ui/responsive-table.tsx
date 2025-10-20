'use client';

import { cn } from '@finapp/ui';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
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
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <table className={cn('min-w-full divide-y divide-border', className)}>
      {children}
    </table>
  );
}

export function TableHeader({ children, className }: TableProps) {
  return (
    <thead className={cn('bg-muted', className)}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className }: TableProps) {
  return (
    <tbody className={cn('divide-y divide-border bg-card', className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className }: TableProps) {
  return (
    <tr className={cn('hover:bg-muted/50 transition-colors', className)}>
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
  isHeader?: boolean;
}

export function TableCell({ children, className, isHeader }: TableCellProps) {
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

