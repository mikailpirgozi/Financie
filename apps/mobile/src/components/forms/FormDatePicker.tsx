import React from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import { ViewStyle } from 'react-native';
import { DatePicker } from '@/components/ui/DatePicker';
import { FormField } from './FormField';

interface FormDatePickerProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  mode?: 'date' | 'time' | 'datetime';
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  locale?: string;
  containerStyle?: ViewStyle;
}

export function FormDatePicker<T extends FieldValues>({
  control,
  name,
  label,
  mode,
  minimumDate,
  maximumDate,
  disabled,
  locale,
  containerStyle,
}: FormDatePickerProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      containerStyle={containerStyle}
      render={({ field, fieldState }) => (
        <DatePicker
          label={label}
          value={field.value ? new Date(field.value) : new Date()}
          onChange={(date) => {
            // Store as YYYY-MM-DD string format
            const dateStr = date.toISOString().split('T')[0] ?? '';
            field.onChange(dateStr as T[typeof name]);
          }}
          mode={mode}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          disabled={disabled}
          error={fieldState.error?.message}
          locale={locale}
        />
      )}
    />
  );
}

