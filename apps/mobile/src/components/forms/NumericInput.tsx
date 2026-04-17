import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import {
  formatLocaleNumber,
  parseLocaleNumber,
  sanitizeNumericInput,
  clampNumber,
  getDecimalSeparator,
  getGroupSeparator,
} from '@finapp/core';
import { useTheme } from '../../contexts';

export interface NumericInputProps extends Omit<
  TextInputProps,
  'value' | 'onChangeText' | 'keyboardType'
> {
  /** Numeric value in the business model; null clears the field. */
  value: number | null | undefined;
  /** Called with a clamped number whenever the user changes value. Null on clear. */
  onChangeValue: (next: number | null) => void;
  label?: string;
  error?: string;
  helperText?: string;
  prefix?: string;
  suffix?: string;
  currency?: string;
  locale?: string;
  /** Max visible decimal digits (user can still type extra; parsed on blur). */
  decimals?: number;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  allowDecimal?: boolean;
  /** Show thousand separators while the input is NOT focused. */
  groupWhileBlurred?: boolean;
  containerStyle?: ViewStyle;
  showClearButton?: boolean;
}

/**
 * Locale-aware numeric input.
 *
 * - Accepts both `,` and `.` as decimal separators.
 * - Shows thousand separators when blurred (if enabled).
 * - Emits clamped numeric value on every keystroke (not only blur).
 * - sk-SK keyboards ship a comma on the decimal-pad — we normalize it correctly.
 */
export function NumericInput({
  value,
  onChangeValue,
  label,
  error,
  helperText,
  prefix,
  suffix,
  currency,
  locale = 'sk-SK',
  decimals = 2,
  min,
  max,
  allowNegative = false,
  allowDecimal = true,
  groupWhileBlurred = true,
  containerStyle,
  showClearButton = false,
  onFocus,
  onBlur,
  style,
  ...rest
}: NumericInputProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const decimalSep = useMemo(() => getDecimalSeparator(locale), [locale]);
  const groupSep = useMemo(() => getGroupSeparator(locale), [locale]);

  const isUserEditing = useRef(false);
  const [focused, setFocused] = useState(false);

  const formatForDisplay = useCallback(
    (n: number | null | undefined): string => {
      if (n === null || n === undefined || !Number.isFinite(n)) return '';
      return formatLocaleNumber(n, {
        locale,
        maximumFractionDigits: decimals,
        useGrouping: groupWhileBlurred,
      });
    },
    [locale, decimals, groupWhileBlurred]
  );

  const formatWhileTyping = useCallback(
    (raw: string): string => {
      // While typing, don't reformat — just sanitize (avoid cursor jumps).
      return sanitizeNumericInput(raw, { allowNegative, allowDecimal });
    },
    [allowNegative, allowDecimal]
  );

  const [displayValue, setDisplayValue] = useState<string>(() => formatForDisplay(value));

  // Sync external value changes when user is NOT actively editing.
  useEffect(() => {
    if (isUserEditing.current) return;
    setDisplayValue(formatForDisplay(value));
  }, [value, formatForDisplay]);

  const commitText = useCallback(
    (text: string, emit: boolean) => {
      const sanitized = formatWhileTyping(text);
      setDisplayValue(sanitized);
      if (!emit) return;
      const parsed = parseLocaleNumber(sanitized);
      const clamped = clampNumber(parsed, min, max);
      onChangeValue(clamped);
    },
    [formatWhileTyping, min, max, onChangeValue]
  );

  const handleChangeText = useCallback(
    (text: string) => {
      isUserEditing.current = true;
      commitText(text, true);
    },
    [commitText]
  );

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      isUserEditing.current = true;
      setFocused(true);
      // When focusing, switch to an ungrouped representation to avoid editing
      // past spaces / NBSP. Keep the decimal separator localized.
      if (value !== null && value !== undefined && Number.isFinite(value)) {
        const bare = formatLocaleNumber(value, {
          locale,
          maximumFractionDigits: decimals,
          useGrouping: false,
        });
        setDisplayValue(bare);
      }
      onFocus?.(e);
    },
    [value, locale, decimals, onFocus]
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      isUserEditing.current = false;
      setFocused(false);

      const parsed = parseLocaleNumber(displayValue);
      const clamped = clampNumber(parsed, min, max);
      onChangeValue(clamped);
      setDisplayValue(formatForDisplay(clamped));
      onBlur?.(e);
    },
    [displayValue, min, max, onChangeValue, formatForDisplay, onBlur]
  );

  const handleClear = useCallback(() => {
    setDisplayValue('');
    onChangeValue(null);
  }, [onChangeValue]);

  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrap,
          {
            borderColor,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {prefix ? (
          <Text style={[styles.affix, { color: colors.textSecondary }]}>{prefix}</Text>
        ) : null}

        <TextInput
          {...rest}
          value={displayValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          keyboardType={allowDecimal ? 'decimal-pad' : 'number-pad'}
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          returnKeyType="done"
          placeholder={rest.placeholder ?? (allowDecimal ? `0${decimalSep}00` : '0')}
          placeholderTextColor={colors.textMuted}
          accessibilityHint={
            helperText ??
            (allowDecimal
              ? `Zadajte číslo (desatinný oddeľovač ${decimalSep}, oddeľovač tisícok ${groupSep.trim() || 'medzera'})`
              : undefined)
          }
          style={[styles.input, { color: colors.text }, style as object]}
        />

        {showClearButton && displayValue.length > 0 ? (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Vymazať"
          >
            <Text style={{ color: colors.textMuted, fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
        ) : null}

        {currency ? (
          <Text style={[styles.affix, { color: colors.textSecondary }]}>{currency}</Text>
        ) : suffix ? (
          <Text style={[styles.affix, { color: colors.textSecondary }]}>{suffix}</Text>
        ) : null}
      </View>

      {error ? (
        <Text style={[styles.hint, { color: colors.danger }]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  affix: {
    fontSize: 15,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  clearBtn: {
    paddingHorizontal: 6,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
});
