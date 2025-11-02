import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClear?: () => void;
  containerStyle?: ViewStyle;
  showClearButton?: boolean;
  style?: TextInputProps['style'];
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onClear,
  containerStyle,
  showClearButton = false,
  value,
  onFocus,
  onBlur,
  style,
  ...textInputProps
}: InputProps) {
  const borderColor = useSharedValue('#e5e7eb');

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    borderColor.value = withTiming(error ? '#ef4444' : '#0070f3', { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    borderColor.value = withTiming(error ? '#ef4444' : '#e5e7eb', { duration: 200 });
    onBlur?.(e);
  };

  const showClear = showClearButton && value && value.length > 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <Animated.View
        style={[
          styles.inputContainer,
          animatedBorderStyle,
          ...(error ? [styles.inputContainerError] : []),
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            ...(leftIcon ? [styles.inputWithLeftIcon] : []),
            ...((rightIcon || showClear) ? [styles.inputWithRightIcon] : []),
            style,
          ]}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="#9ca3af"
          {...textInputProps}
        />
        
        {showClear && (
          <TouchableOpacity
            onPress={onClear}
            style={styles.clearButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
        
        {rightIcon && !showClear && (
          <View style={styles.rightIcon}>{rightIcon}</View>
        )}
      </Animated.View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    minHeight: 48,
  },
  inputContainerError: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  leftIcon: {
    paddingLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    paddingRight: 12,
    paddingLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 18,
    color: '#9ca3af',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
});

