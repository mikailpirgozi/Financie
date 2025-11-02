import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
// @ts-expect-error - React Native Slider is not typed
import Slider from '@react-native-community/slider';

interface SmartSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  suffix?: string;
  formatDisplay?: (value: number) => string;
  disabled?: boolean;
}

/**
 * Smart slider with synced manual input for mobile
 */
export function SmartSlider({
  label,
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 1,
  suffix = '',
  formatDisplay,
  disabled = false,
}: SmartSliderProps) {
  const [inputValue, setInputValue] = useState(
    step < 1 ? value.toFixed(2) : value.toString()
  );

  useEffect(() => {
    setInputValue(step < 1 ? value.toFixed(2) : value.toString());
  }, [value, step]);

  const handleInputChange = (text: string) => {
    setInputValue(text);
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(minimumValue, Math.min(maximumValue, parsed));
      // Round to step precision or 2 decimal places for money/percentages
      const rounded = step < 1 ? Number(clamped.toFixed(2)) : Math.round(clamped / step) * step;
      onValueChange(rounded);
      setInputValue(rounded.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  const displayValue = formatDisplay
    ? formatDisplay(value)
    : `${value.toLocaleString('sk-SK')}${suffix}`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Display value */}
      <View style={styles.valueBox}>
        <Text style={styles.valueText}>{displayValue}</Text>
      </View>

      {/* Slider */}
      <Slider
        style={styles.slider}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor="#8b5cf6"
        maximumTrackTintColor="#e5e7eb"
        thumbTintColor="#8b5cf6"
        disabled={disabled}
      />

      {/* Min/Max labels */}
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>
          {formatDisplay ? formatDisplay(minimumValue) : `${minimumValue}${suffix}`}
        </Text>
        <Text style={styles.rangeLabel}>
          {formatDisplay ? formatDisplay(maximumValue) : `${maximumValue}${suffix}`}
        </Text>
      </View>

      {/* Manual input */}
      <View style={styles.manualInput}>
        <Text style={styles.manualLabel}>alebo manuálne:</Text>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={handleInputChange}
          onBlur={handleInputBlur}
          keyboardType="decimal-pad"
          editable={!disabled}
          placeholder={step < 1 ? '0.00' : '0'}
          placeholderTextColor="#9ca3af"
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  valueBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rangeLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  manualInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manualLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  suffix: {
    fontSize: 12,
    color: '#6b7280',
  },
});

