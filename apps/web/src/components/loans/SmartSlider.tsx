'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@finapp/ui';
import {
  clampNumber,
  formatLocaleNumber,
  parseLocaleNumber,
  sanitizeNumericInput,
  getDecimalSeparator,
} from '@finapp/core';

interface SmartSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  currency?: string;
  formatDisplay?: (value: number) => string;
  disabled?: boolean;
  helperText?: string;
  decimals?: number;
  presets?: { label: string; value: number }[];
  locale?: string;
}

/**
 * Web Smart slider with locale-aware manual input.
 *
 * - Accepts both `,` and `.` as decimal separators (sk-SK)
 * - Emits numeric values on every keystroke
 * - Uses inputMode="decimal" for mobile browsers
 */
export function SmartSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = '',
  currency,
  formatDisplay,
  disabled = false,
  helperText,
  decimals,
  presets,
  locale = 'sk-SK',
}: SmartSliderProps): React.JSX.Element {
  const effectiveDecimals = decimals ?? (step < 1 ? 2 : 0);
  const decimalSep = useMemo(() => getDecimalSeparator(locale), [locale]);

  const isUserEditing = useRef(false);
  const [inputValue, setInputValue] = useState<string>(() =>
    Number.isFinite(value)
      ? formatLocaleNumber(value, {
          locale,
          maximumFractionDigits: effectiveDecimals,
          useGrouping: false,
        })
      : ''
  );

  useEffect(() => {
    if (isUserEditing.current) return;
    setInputValue(
      Number.isFinite(value)
        ? formatLocaleNumber(value, {
            locale,
            maximumFractionDigits: effectiveDecimals,
            useGrouping: false,
          })
        : ''
    );
  }, [value, locale, effectiveDecimals]);

  const commit = useCallback(
    (n: number | null) => {
      const clamped = clampNumber(n, min, max);
      if (clamped === null) return;
      onChange(clamped);
    },
    [min, max, onChange]
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (Number.isFinite(newValue)) {
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isUserEditing.current = true;
    const sanitized = sanitizeNumericInput(e.target.value, {
      allowDecimal: effectiveDecimals > 0,
    });
    setInputValue(sanitized);
    const parsed = parseLocaleNumber(sanitized);
    if (parsed !== null) commit(parsed);
  };

  const handleInputBlur = () => {
    isUserEditing.current = false;
    const parsed = parseLocaleNumber(inputValue);
    if (parsed !== null) {
      const clamped = clampNumber(parsed, min, max) ?? min;
      onChange(clamped);
      setInputValue(
        formatLocaleNumber(clamped, {
          locale,
          maximumFractionDigits: effectiveDecimals,
          useGrouping: false,
        })
      );
    } else {
      setInputValue(
        formatLocaleNumber(value, {
          locale,
          maximumFractionDigits: effectiveDecimals,
          useGrouping: false,
        })
      );
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  const displayValue = formatDisplay
    ? formatDisplay(value)
    : `${formatLocaleNumber(value, { locale, maximumFractionDigits: effectiveDecimals })}${suffix}`;
  const percentage = max !== min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">{label}</label>

      {presets && presets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = Math.abs(p.value - value) < Math.max(step / 2, 0.001);
            return (
              <button
                key={p.value}
                type="button"
                disabled={disabled}
                onClick={() => commit(p.value)}
                className={
                  active
                    ? 'rounded-full border border-primary bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground'
                    : 'rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted'
                }
              >
                {p.label}
              </button>
            );
          })}
        </div>
      ) : null}

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
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {formatDisplay
            ? formatDisplay(min)
            : `${formatLocaleNumber(min, { locale, maximumFractionDigits: effectiveDecimals })}${suffix}`}
        </span>
        <span className="font-semibold text-foreground text-base">{displayValue}</span>
        <span>
          {formatDisplay
            ? formatDisplay(max)
            : `${formatLocaleNumber(max, { locale, maximumFractionDigits: effectiveDecimals })}${suffix}`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">alebo manuálne:</span>
        <Input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          placeholder={effectiveDecimals > 0 ? `0${decimalSep}00` : '0'}
          className="flex-1"
        />
        {currency ? (
          <span className="text-sm text-muted-foreground">{currency}</span>
        ) : suffix ? (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        ) : null}
      </div>

      {helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}
