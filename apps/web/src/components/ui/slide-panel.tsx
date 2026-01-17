'use client';

import * as React from 'react';
import { X, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// SLIDE PANEL
// ============================================

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

const widthClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
};

export function SlidePanel({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  width = 'lg',
}: SlidePanelProps): React.JSX.Element | null {
  // Close on ESC
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'w-full bg-background shadow-2xl flex flex-col animate-in slide-in-from-right',
          widthClasses[width]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="p-2 rounded-lg bg-primary/10">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t bg-muted/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SLIDE PANEL SECTION
// ============================================

interface SlidePanelSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function SlidePanelSection({
  title,
  description,
  icon,
  badge,
  children,
  collapsible = false,
  defaultExpanded = true,
}: SlidePanelSectionProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3 bg-muted/30',
          collapsible && 'cursor-pointer hover:bg-muted/50 transition-colors'
        )}
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="text-primary">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm">{title}</h3>
              {badge}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {collapsible && (
          <div className="text-muted-foreground">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </div>
      {(!collapsible || isExpanded) && (
        <div className="p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================
// SLIDE PANEL ALERT
// ============================================

interface SlidePanelAlertProps {
  type: 'info' | 'warning' | 'success' | 'error';
  children: React.ReactNode;
}

const alertConfig = {
  info: {
    icon: Info,
    className: 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300',
  },
  warning: {
    icon: AlertCircle,
    className: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300',
  },
  error: {
    icon: AlertCircle,
    className: 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300',
  },
};

export function SlidePanelAlert({ type, children }: SlidePanelAlertProps): React.JSX.Element {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-lg border', config.className)}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="text-sm">{children}</div>
    </div>
  );
}

// ============================================
// FORM FIELD
// ============================================

interface FormFieldProps {
  label: string;
  required?: boolean;
  helperText?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, required, helperText, error, children }: FormFieldProps): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

// ============================================
// SLIDE PANEL BUTTON
// ============================================

interface SlidePanelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function SlidePanelButton({
  variant = 'primary',
  isLoading,
  children,
  className,
  disabled,
  ...props
}: SlidePanelButtonProps): React.JSX.Element {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };

  return (
    <button
      className={cn(
        'px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50',
        variantClasses[variant],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Ukladám...
        </span>
      ) : children}
    </button>
  );
}

// ============================================
// CSS CLASS HELPERS
// ============================================

export const inputClassName = cn(
  'w-full px-3 py-2 bg-background border rounded-lg',
  'text-sm placeholder:text-muted-foreground',
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
  'disabled:opacity-50 disabled:cursor-not-allowed'
);

export const selectClassName = cn(
  'w-full px-3 py-2 bg-background border rounded-lg',
  'text-sm',
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
  'disabled:opacity-50 disabled:cursor-not-allowed'
);

export const textareaClassName = cn(
  'w-full px-3 py-2 bg-background border rounded-lg',
  'text-sm placeholder:text-muted-foreground resize-none',
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
  'disabled:opacity-50 disabled:cursor-not-allowed'
);
