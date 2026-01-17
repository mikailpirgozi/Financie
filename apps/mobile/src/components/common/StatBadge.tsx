import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatBadgeProps {
  icon?: ReactNode;
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function StatBadge({
  icon,
  label,
  variant = 'primary',
  size = 'md',
  style,
}: StatBadgeProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          background: colors.successLight,
          border: colors.success,
          text: colors.success,
        };
      case 'warning':
        return {
          background: colors.warningLight,
          border: colors.warning,
          text: colors.warning,
        };
      case 'danger':
        return {
          background: colors.dangerLight,
          border: colors.danger,
          text: colors.danger,
        };
      case 'info':
        return {
          background: colors.infoLight,
          border: colors.info,
          text: colors.info,
        };
      case 'neutral':
        return {
          background: colors.surfacePressed,
          border: colors.border,
          text: colors.textSecondary,
        };
      case 'primary':
      default:
        return {
          background: colors.primaryLight,
          border: colors.primary,
          text: colors.primary,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontSize: 11,
          iconSize: 12,
          gap: 4,
        };
      case 'lg':
        return {
          paddingHorizontal: 16,
          paddingVertical: 10,
          fontSize: 15,
          iconSize: 18,
          gap: 8,
        };
      case 'md':
      default:
        return {
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 13,
          iconSize: 14,
          gap: 6,
        };
    }
  };

  const variantColors = getVariantColors();
  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: variantColors.background,
          borderColor: variantColors.border,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          gap: sizeStyles.gap,
        },
        style,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.badgeText,
          {
            color: variantColors.text,
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

interface BadgeRowProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function BadgeRow({ children, style }: BadgeRowProps) {
  return <View style={[styles.badgeRow, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
});
