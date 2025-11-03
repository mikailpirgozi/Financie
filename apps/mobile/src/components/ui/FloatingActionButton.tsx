import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface FloatingActionButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  icon: string;
  label?: string;
  style?: ViewStyle;
  disabled?: boolean;
  backgroundColor?: string;
}

export function FloatingActionButton({
  onPress,
  onLongPress,
  icon,
  label,
  style,
  disabled = false,
  backgroundColor,
}: FloatingActionButtonProps) {
  const handlePress = (event: GestureResponderEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(event);
  };

  const handleLongPress = (event: GestureResponderEvent) => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onLongPress(event);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        disabled && styles.fabDisabled,
        backgroundColor && { backgroundColor },
        style,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>{icon}</Text>
      {label && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#8b5cf6',
    borderRadius: 56,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

