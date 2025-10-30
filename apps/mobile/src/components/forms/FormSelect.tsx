import React from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import { ViewStyle } from 'react-native';
import { Select, SelectOption } from '@/components/ui/Select';
import { FormField } from './FormField';

interface FormSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  multiSelect?: boolean;
  containerStyle?: ViewStyle;
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  disabled,
  searchable,
  multiSelect,
  containerStyle,
}: FormSelectProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      containerStyle={containerStyle}
      render={({ field, fieldState }) => (
        <Select
          label={label}
          value={field.value}
          options={options}
          onChange={field.onChange}
          placeholder={placeholder}
          error={fieldState.error?.message}
          disabled={disabled}
          searchable={searchable}
          multiSelect={multiSelect}
        />
      )}
    />
  );
}

