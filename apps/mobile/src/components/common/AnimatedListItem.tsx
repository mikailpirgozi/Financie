import React, { ReactNode, useRef } from 'react';
import { View, StyleSheet, Pressable, ViewStyle, Animated, Text } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';

interface AnimatedListItemProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  statusColor?: string;
  showChevron?: boolean;
  style?: ViewStyle;
}

export function AnimatedListItem({
  children,
  onPress,
  onLongPress,
  statusColor,
  showChevron = true,
  style,
}: AnimatedListItemProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress();
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
          },
          style,
        ]}
      >
        {/* Status Indicator */}
        {statusColor && (
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        )}

        {/* Content */}
        <View style={[styles.content, !statusColor && styles.contentNoStatus]}>
          {children}
        </View>

        {/* Chevron */}
        {showChevron && (
          <View style={styles.chevronContainer}>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

interface ListItemHeaderProps {
  children: ReactNode;
  icon?: ReactNode;
  style?: ViewStyle;
}

export function ListItemHeader({ children, icon, style }: ListItemHeaderProps) {
  return (
    <View style={[styles.headerRow, style]}>
      <View style={styles.titleSection}>
        {icon && <View style={styles.statusIcon}>{icon}</View>}
        {children}
      </View>
    </View>
  );
}

interface ListItemAmountProps {
  amount: number | string;
  label?: string;
  color?: string;
  formatCurrency?: (amount: number) => string;
}

export function ListItemAmount({
  amount,
  label,
  color,
  formatCurrency,
}: ListItemAmountProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const textColor = color || colors.text;

  const defaultFormat = (amt: number) => {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const formatter = formatCurrency || defaultFormat;
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formattedAmount = isNaN(numericAmount) ? '0 €' : formatter(numericAmount);

  return (
    <View style={styles.amountRow}>
      <Text style={[styles.amountText, { color: textColor }]}>
        {formattedAmount}
      </Text>
      {label && (
        <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
          {label}
        </Text>
      )}
    </View>
  );
}

interface ListItemProgressProps {
  progress: number; // 0-100
  color?: string;
}

export function ListItemProgress({ progress, color }: ListItemProgressProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const progressColor = color || colors.primary;

  return (
    <View style={styles.progressSection}>
      <View style={[styles.progressTrack, { backgroundColor: colors.borderLight }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(Math.max(progress, 0), 100)}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color: colors.textMuted }]}>
        {Math.round(progress)}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentNoStatus: {
    paddingLeft: 16,
  },
  chevronContainer: {
    justifyContent: 'center',
    paddingRight: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  statusIcon: {
    marginRight: 6,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  amountText: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 32,
    textAlign: 'right',
  },
});
