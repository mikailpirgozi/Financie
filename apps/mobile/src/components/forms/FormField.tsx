import React from 'react';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  render: (props: {
    field: {
      value: T[Path<T>];
      onChange: (value: T[Path<T>]) => void;
      onBlur: () => void;
    };
    fieldState: {
      error?: { message?: string };
    };
  }) => React.ReactElement;
  containerStyle?: ViewStyle;
}

export function FormField<T extends FieldValues>({
  control,
  name,
  render,
  containerStyle,
}: FormFieldProps<T>) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Controller
        control={control}
        name={name}
        render={({ field, fieldState }) => render({ field, fieldState })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
});

