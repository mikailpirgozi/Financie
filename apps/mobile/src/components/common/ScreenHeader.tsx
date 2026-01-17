import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';

interface ScreenHeaderProps {
  title: string;
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  rightContent?: ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  actionLabel,
  actionIcon,
  onAction,
  rightContent,
  style,
}: ScreenHeaderProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const handleAction = () => {
    if (onAction) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onAction();
    }
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {rightContent}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={handleAction}
        >
          {actionIcon || <Plus size={20} color={colors.textInverse} />}
          <Text style={[styles.actionButtonText, { color: colors.textInverse }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
