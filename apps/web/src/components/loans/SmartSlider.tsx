'use client';

import { useState, useEffect } from 'react';
import { Input } from '@finapp/ui';

interface SmartSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  formatDisplay?: (value: number) => string;
  disabled?: boolean;
}

/**
 * Smart slider with synced manual input
 * Allows both slider and direct text input
 */
export function SmartSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
  formatDisplay,
  disabled = false,
}: SmartSliderProps): React.JSX.Element {
  const [inputValue, setInputValue] = useState(value.toString());

  // Sync input with prop value
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      // Always round to 2 decimal places (cent precision) for manual input
      const rounded = Number(clamped.toFixed(2));
      onChange(rounded);
      setInputValue(rounded.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  const displayValue = formatDisplay ? formatDisplay(value) : `${value}${suffix}`;
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">{label}</label>
      
      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleSliderChange}
          disabled={disabled}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider-thumb disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentage}%, hsl(var(--muted)) ${percentage}%, hsl(var(--muted)) 100%)`,
          }}
        />
      </div>

      {/* Value labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDisplay ? formatDisplay(min) : `${min}${suffix}`}</span>
        <span className="font-semibold text-foreground text-base">{displayValue}</span>
        <span>{formatDisplay ? formatDisplay(max) : `${max}${suffix}`}</span>
      </div>

      {/* Manual input */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">alebo manuálne:</span>
        <Input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          step="0.01"
          min={min}
          max={max}
          className="flex-1"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

