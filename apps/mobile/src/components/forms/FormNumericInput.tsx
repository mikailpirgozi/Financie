import React from 'react';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { NumericInput, NumericInputProps } from './NumericInput';

type FormNumericInputProps<T extends FieldValues> = Omit<
  NumericInputProps,
  'value' | 'onChangeValue' | 'error'
> & {
  control: Control<T>;
  name: Path<T>;
  /** If true, empty input becomes 0 in the form (default: null -> field untouched). */
  emptyIsZero?: boolean;
};

export function FormNumericInput<T extends FieldValues>({
  control,
  name,
  emptyIsZero = false,
  ...rest
}: FormNumericInputProps<T>) {
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
            value={numericValue}
            onChangeValue={(next) => {
              if (next === null && emptyIsZero) {
                field.onChange(0);
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
