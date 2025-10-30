'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@finapp/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Log to error reporting service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-4">
          <div className="max-w-md text-center">
            <h3 className="text-lg font-semibold mb-2">Nastala chyba</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ospravedlňujeme sa, táto časť aplikácie nefunguje správne.
            </p>
            {this.state.error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-xs text-left">
                <code>{this.state.error.message}</code>
              </div>
            )}
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              size="sm"
            >
              Obnoviť stránku
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

