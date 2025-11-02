'use client';

import { LOAN_CALCULATION_MODES, type LoanCalculationMode } from '@finapp/core';

interface LoanModeSelectorProps {
  value: LoanCalculationMode;
  onChange: (value: LoanCalculationMode) => void;
  disabled?: boolean;
}

/**
 * Radio selector for loan calculation mode
 * User selects which 2 parameters they know
 */
export function LoanModeSelector({
  value,
  onChange,
  disabled = false,
}: LoanModeSelectorProps): React.JSX.Element {
  const modes: LoanCalculationMode[] = ['rate_term', 'payment_term', 'rate_payment'];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">🎯 Aké údaje poznáte?</label>
      
      <div className="space-y-2">
        {modes.map((mode) => {
          const info = LOAN_CALCULATION_MODES[mode];
          const isSelected = value === mode;
          
          return (
            <label
              key={mode}
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="radio"
                name="calculationMode"
                value={mode}
                checked={isSelected}
                onChange={(e) => onChange(e.target.value as LoanCalculationMode)}
                disabled={disabled}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">{info.label}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  → {info.description}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

