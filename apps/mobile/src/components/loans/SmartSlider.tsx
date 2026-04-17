import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { clampNumber } from '@finapp/core';
import { useTheme } from '../../contexts';
import { NumericInput } from '../forms/NumericInput';

interface SmartSliderProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  suffix?: string;
  currency?: string;
  formatDisplay?: (value: number) => string;
  disabled?: boolean;
  helperText?: string;
  /** Number of decimal places shown in the manual input. Defaults based on step. */
  decimals?: number;
  /** Optional preset chips rendered above the slider. */
  presets?: { label: string; value: number }[];
  /** Accessibility label for the slider handle. */
  accessibilityLabel?: string;
}

/**
 * Smart slider with synced locale-aware manual input.
 *
 * Improvements over the legacy implementation:
 * - Slider updates parent on every tick (no 200ms throttle) — preview updates live
 * - Manual input emits numeric values on every keystroke (not only blur)
 * - Haptic feedback on slider release and preset taps
 * - Theme-aware colours (works in dark mode)
 * - Accepts sk-SK comma decimals via shared locale-aware parser
 * - Accessible (adjustable role with value)
 */
export const SmartSlider = React.memo(function SmartSlider({
  label,
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 1,
  suffix = '',
  currency,
  formatDisplay,
  disabled = false,
  helperText,
  decimals,
  presets,
  accessibilityLabel,
}: SmartSliderProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : minimumValue;
  const effectiveDecimals = decimals ?? (step < 1 ? 2 : 0);

  const [sliderValue, setSliderValue] = useState(safeValue);
  const lastHapticRef = useRef<number>(0);

  useEffect(() => {
    const safe = typeof value === 'number' && Number.isFinite(value) ? value : minimumValue;
    setSliderValue(safe);
  }, [value, minimumValue]);

  const handleSliderChange = useCallback(
    (newValue: number) => {
      if (typeof newValue !== 'number' || Number.isNaN(newValue)) return;
      setSliderValue(newValue); // immediate visual feedback
      try {
        onValueChange(newValue);
      } catch (e) {
        console.warn('SmartSlider onValueChange error:', e);
      }
      // Light haptic every ~10 steps of change
      const now = Date.now();
      if (now - lastHapticRef.current > 100) {
        lastHapticRef.current = now;
        Haptics.selectionAsync().catch(() => {});
      }
    },
    [onValueChange]
  );

  const handleSliderComplete = useCallback(
    (newValue: number) => {
      if (typeof newValue !== 'number' || Number.isNaN(newValue)) return;
      setSliderValue(newValue);
      try {
        onValueChange(newValue);
      } catch (e) {
        console.warn('SmartSlider onSlidingComplete error:', e);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    [onValueChange]
  );

  const handleManualChange = useCallback(
    (next: number | null) => {
      if (next === null) return;
      const clamped = clampNumber(next, minimumValue, maximumValue) ?? minimumValue;
      setSliderValue(clamped);
      onValueChange(clamped);
    },
    [minimumValue, maximumValue, onValueChange]
  );

  const handlePresetPress = useCallback(
    (presetValue: number) => {
      const clamped = clampNumber(presetValue, minimumValue, maximumValue) ?? presetValue;
      setSliderValue(clamped);
      onValueChange(clamped);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    },
    [minimumValue, maximumValue, onValueChange]
  );

  const displayValue = formatDisplay
    ? formatDisplay(sliderValue)
    : `${sliderValue.toLocaleString('sk-SK', { maximumFractionDigits: effectiveDecimals })}${suffix}`;

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}

      <View
        style={[styles.valueBox, { backgroundColor: colors.surfaceElevated ?? colors.surface }]}
      >
        <Text style={[styles.valueText, { color: colors.text }]}>{displayValue}</Text>
      </View>

      {presets && presets.length > 0 ? (
        <View style={styles.presetRow}>
          {presets.map((p) => {
            const active = Math.abs(p.value - sliderValue) < step / 2;
            return (
              <Text
                key={p.value}
                onPress={disabled ? undefined : () => handlePresetPress(p.value)}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    color: active ? colors.textInverse : colors.textSecondary,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${label} preset ${p.label}`}
              >
                {p.label}
              </Text>
            );
          })}
        </View>
      ) : null}

      <Slider
        style={styles.slider}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        value={sliderValue}
        onValueChange={handleSliderChange}
        onSlidingComplete={handleSliderComplete}
        minimumTrackTintColor={colors.primary}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.primary}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityValue={{ min: minimumValue, max: maximumValue, now: sliderValue }}
      />

      <View style={styles.rangeLabels}>
        <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>
          {formatDisplay ? formatDisplay(minimumValue) : `${minimumValue}${suffix}`}
        </Text>
        <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>
          {formatDisplay ? formatDisplay(maximumValue) : `${maximumValue}${suffix}`}
        </Text>
      </View>

      <NumericInput
        value={sliderValue}
        onChangeValue={handleManualChange}
        min={minimumValue}
        max={maximumValue}
        decimals={effectiveDecimals}
        suffix={suffix}
        currency={currency}
        helperText={helperText}
        containerStyle={styles.manualInputContainer}
      />
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
    marginBottom: 10,
  },
  valueBox: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700',
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
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  manualInputContainer: {
    marginTop: 4,
    marginBottom: 0,
  },
});
