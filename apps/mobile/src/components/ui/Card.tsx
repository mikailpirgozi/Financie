import React, { useRef } from 'react';
import { View, StyleSheet, ViewStyle, Platform, Pressable, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

type CardVariant = 'default' | 'outlined' | 'elevated';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  testID?: string;
}

export function Card({
  children,
  variant = 'default',
  onPress,
  style,
  testID,
}: CardProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (onPress) {
      Animated.spring(scale, {
        toValue: 0.98,
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const variantStyle = getVariantStyle(variant);

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
      >
        <Animated.View style={[styles.card, variantStyle, style, { transform: [{ scale }] }]}>
          {children}
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, variantStyle, style]} testID={testID}>
      {children}
    </View>
  );
}

function getVariantStyle(variant: CardVariant): ViewStyle {
  switch (variant) {
    case 'outlined':
      return styles.outlined;
    case 'elevated':
      return styles.elevated;
    default:
      return styles.default;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  default: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});

