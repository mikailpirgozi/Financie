import React from 'react';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { ViewStyle } from 'react-native';
import { NumericInput, NumericInputProps } from './NumericInput';

interface CurrencyInputProps<T extends FieldValues> extends Omit<
  NumericInputProps,
  'value' | 'onChangeValue' | 'error' | 'currency' | 'decimals'
> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  currency?: string;
  containerStyle?: ViewStyle;
  /** Whether empty input should be stored as 0 (default) or null. */
  emptyIsZero?: boolean;
  decimals?: number;
}

/**
 * Currency form input (react-hook-form integrated).
 *
 * Backwards-compatible wrapper around the new locale-aware NumericInput.
 * Accepts both `.` and `,` as decimal separators, formats thousand separators
 * when blurred, and emits numeric values to the form (not strings).
 */
export function CurrencyInput<T extends FieldValues>({
  control,
  name,
  label,
  currency = '€',
  containerStyle,
  emptyIsZero = true,
  decimals = 2,
  min = 0,
  ...rest
}: CurrencyInputProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const numericValue =
          field.value === null || field.value === undefined || field.value === ''
            ? null
            : typeof field.value === 'number'
              ? field.value
              : Number(field.value);

        return (
          <NumericInput
            {...rest}
            label={label}
            containerStyle={containerStyle}
            currency={currency}
            decimals={decimals}
            min={min}
            value={numericValue}
            onChangeValue={(next) => {
              if (next === null) {
                field.onChange(emptyIsZero ? 0 : null);
              } else {
                field.onChange(next);
              }
            }}
            error={fieldState.error?.message}
          />
        );
      }}
    />
  );
}
