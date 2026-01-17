import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  GestureResponderEvent,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

interface FloatingActionButtonProps {
  onPress: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  icon: string | React.ReactNode;
  label?: string;
  style?: ViewStyle;
  disabled?: boolean;
  backgroundColor?: string;
  textColor?: string;
}

export function FloatingActionButton({
  onPress,
  onLongPress,
  icon,
  label,
  style,
  disabled = false,
  backgroundColor,
  textColor = '#ffffff',
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

  const renderIcon = () => {
    if (typeof icon === 'string') {
      return <Text style={styles.iconText}>{icon}</Text>;
    }
    return <View style={styles.iconContainer}>{icon}</View>;
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
      {renderIcon()}
      {label && <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
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
  iconText: {
    fontSize: 24,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
