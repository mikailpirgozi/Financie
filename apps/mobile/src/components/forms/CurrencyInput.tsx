import React, { useState } from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import { TextInputProps, ViewStyle, Text } from 'react-native';
import { Input } from '@/components/ui/Input';
import { FormField } from './FormField';

interface CurrencyInputProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  currency?: string;
  containerStyle?: ViewStyle;
}

export function CurrencyInput<T extends FieldValues>({
  control,
  name,
  label,
  currency = '€',
  containerStyle,
  ...textInputProps
}: CurrencyInputProps<T>) {
  const [displayValue, setDisplayValue] = useState('');

  const formatCurrency = (value: string): string => {
    // Remove all non-digit characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    if (parts.length > 2) {
      return displayValue;
    }

    // Format with thousands separator
    if (parts[0]) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    return parts.join('.');
  };

  const parseValue = (formattedValue: string): number => {
    const numericValue = formattedValue.replace(/\s/g, '');
    return parseFloat(numericValue) || 0;
  };

  return (
    <FormField
      control={control}
      name={name}
      containerStyle={containerStyle}
      render={({ field, fieldState }) => {
        // Initialize display value from field value
        if (!displayValue && field.value) {
          setDisplayValue(formatCurrency(field.value.toString()));
        }

        return (
          <Input
            label={label}
            value={displayValue}
            onChangeText={(text) => {
              const formatted = formatCurrency(text);
              setDisplayValue(formatted);
              const parsed = parseValue(formatted);
              field.onChange(parsed);
            }}
            onBlur={() => {
              field.onBlur();
              // Format on blur
              if (displayValue) {
                const parsed = parseValue(displayValue);
                const formatted = formatCurrency(parsed.toFixed(2));
                setDisplayValue(formatted);
              }
            }}
            error={fieldState.error?.message}
            keyboardType="decimal-pad"
            rightIcon={<Text style={{ fontSize: 16, color: '#6b7280' }}>{currency}</Text>}
            placeholder="0.00"
            {...textInputProps}
          />
        );
      }}
    />
  );
}

