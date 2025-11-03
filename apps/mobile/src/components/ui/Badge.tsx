import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { container: ViewStyle; text: TextStyle }> = {
  default: {
    container: { backgroundColor: '#e5e7eb' },
    text: { color: '#374151' },
  },
  success: {
    container: { backgroundColor: '#d1fae5' },
    text: { color: '#065f46' },
  },
  error: {
    container: { backgroundColor: '#fee2e2' },
    text: { color: '#991b1b' },
  },
  warning: {
    container: { backgroundColor: '#fef3c7' },
    text: { color: '#92400e' },
  },
  info: {
    container: { backgroundColor: '#dbeafe' },
    text: { color: '#1e40af' },
  },
};

const sizeStyles: Record<BadgeSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    text: { fontSize: 11, fontWeight: '500' },
  },
  md: {
    container: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    text: { fontSize: 12, fontWeight: '600' },
  },
  lg: {
    container: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    text: { fontSize: 14, fontWeight: '600' },
  },
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  style,
}: BadgeProps) {
  // Safeguard: fallback to 'default' if variant is invalid
  const safeVariant = variant && variantStyles[variant] ? variant : 'default';
  const safeSize = size && sizeStyles[size] ? size : 'md';

  return (
    <View
      style={[
        styles.container,
        variantStyles[safeVariant].container,
        sizeStyles[safeSize].container,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variantStyles[safeVariant].text,
          sizeStyles[safeSize].text,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  text: {
    textAlign: 'center',
  },
});

