import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated, PanResponder, Pressable } from 'react-native';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onDismiss: () => void;
  duration?: number;
}

const toastConfig: Record<ToastType, { backgroundColor: string; emoji: string }> = {
  success: { backgroundColor: '#10b981', emoji: '✓' },
  error: { backgroundColor: '#ef4444', emoji: '✕' },
  info: { backgroundColor: '#0070f3', emoji: 'ℹ' },
  warning: { backgroundColor: '#f59e0b', emoji: '⚠' },
};

export function Toast({
  message,
  type = 'info',
  visible,
  onDismiss,
  duration = 3000,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 15,
          stiffness: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy < -5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          handleDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            damping: 15,
            stiffness: 300,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!visible) return null;

  const config = toastConfig[type];

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        { backgroundColor: config.backgroundColor },
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable onPress={handleDismiss} style={styles.content}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emoji: {
    fontSize: 20,
    marginRight: 12,
    color: '#ffffff',
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
});

