import React from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import { TextInputProps, ViewStyle } from 'react-native';
import { Input } from '@/components/ui/Input';
import { FormField } from './FormField';

interface FormInputProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showClearButton?: boolean;
  containerStyle?: ViewStyle;
}

export function FormInput<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  leftIcon,
  rightIcon,
  showClearButton,
  containerStyle,
  ...textInputProps
}: FormInputProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      containerStyle={containerStyle}
      render={({ field, fieldState }) => (
        <Input
          label={label}
          value={String(field.value || '')}
          onChangeText={(text) => field.onChange(text as T[typeof name])}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          leftIcon={leftIcon}
          rightIcon={rightIcon}
          showClearButton={showClearButton}
          onClear={() => field.onChange('' as T[typeof name])}
          {...textInputProps}
        />
      )}
    />
  );
}

