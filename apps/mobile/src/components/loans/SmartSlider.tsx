import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Keyboard } from 'react-native';
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
 * Optimized with throttled slider updates to prevent lag
 */
export const SmartSlider = React.memo(function SmartSlider({
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
  // Ensure value is a valid number (prevent crash on undefined/NaN)
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : minimumValue;
  
  const [inputValue, setInputValue] = useState(
    step < 1 ? safeValue.toFixed(2) : safeValue.toString()
  );
  const [sliderValue, setSliderValue] = useState(safeValue);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    const safe = typeof value === 'number' && !isNaN(value) ? value : minimumValue;
    setInputValue(step < 1 ? safe.toFixed(2) : safe.toString());
    setSliderValue(safe);
  }, [value, step, minimumValue]);

  // Update parent every 200ms while sliding (throttled) + show local state immediately
  const handleSliderChange = useCallback((newValue: number) => {
    setSliderValue(newValue); // Immediate visual feedback
    
    const now = Date.now();
    if (now - lastUpdateRef.current > 200) {
      lastUpdateRef.current = now;
      onValueChange(newValue); // Throttled parent update
    }
  }, [onValueChange]);

  // Final update when releasing slider
  const handleSliderComplete = useCallback((newValue: number) => {
    setSliderValue(newValue);
    onValueChange(newValue);
    lastUpdateRef.current = Date.now();
  }, [onValueChange]);

  const handleInputChange = (text: string) => {
    setInputValue(text);
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(minimumValue, Math.min(maximumValue, parsed));
      // Always round to 2 decimal places (cent precision) for manual input
      const rounded = Number(clamped.toFixed(2));
      onValueChange(rounded);
      setInputValue(rounded.toString());
    } else {
      setInputValue(value.toString());
    }
  };

  // Show slider value during dragging, otherwise show committed value
  const displayValue = formatDisplay
    ? formatDisplay(sliderValue)
    : `${sliderValue.toLocaleString('sk-SK')}${suffix}`;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Display value */}
      <View style={styles.valueBox}>
        <Text style={styles.valueText}>{displayValue}</Text>
      </View>

      {/* Slider with throttled updates */}
      <Slider
        style={styles.slider}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={sliderValue}
        onValueChange={handleSliderChange}
        onSlidingComplete={handleSliderComplete}
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
          returnKeyType="done"
          onSubmitEditing={() => {
            Keyboard.dismiss();
            handleInputBlur();
          }}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </View>
    </View>
  );
});

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

