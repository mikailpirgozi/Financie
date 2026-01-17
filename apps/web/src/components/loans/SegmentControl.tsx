'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-xl bg-muted p-1',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined && option.count > 0 && (
              <span
                className={cn(
                  'min-w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-semibold',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted-foreground/20 text-muted-foreground'
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
