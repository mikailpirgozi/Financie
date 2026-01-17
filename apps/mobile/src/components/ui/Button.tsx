import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; text: TextStyle }> = {
  primary: {
    container: { backgroundColor: '#0070f3' },
    text: { color: '#ffffff' },
  },
  secondary: {
    container: { backgroundColor: '#8b5cf6' },
    text: { color: '#ffffff' },
  },
  outline: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#0070f3' },
    text: { color: '#0070f3' },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: '#0070f3' },
  },
  destructive: {
    container: { backgroundColor: '#ef4444' },
    text: { color: '#ffffff' },
  },
};

const sizeStyles: Record<ButtonSize, { container: ViewStyle; text: TextStyle }> = {
  sm: {
    container: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, minHeight: 36 },
    text: { fontSize: 14, fontWeight: '500' },
  },
  md: {
    container: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, minHeight: 48 },
    text: { fontSize: 16, fontWeight: '600' },
  },
  lg: {
    container: { paddingHorizontal: 20, paddingVertical: 16, borderRadius: 10, minHeight: 56 },
    text: { fontSize: 18, fontWeight: '600' },
  },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  testID,
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scale, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    }
  };

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: disabled || loading ? 0.5 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [disabled, loading, opacity]);

  // Check if flex-related styles are present
  const hasFlexStyle = style && typeof style === 'object' && 
    ('flex' in style || 'flexGrow' in style || 'flexShrink' in style || 'flexBasis' in style);

  // Extract flex-related styles for the outer wrapper (don't pass them to inner TouchableOpacity)
  const outerStyle: ViewStyle = {
    transform: [{ scale }],
    opacity,
  };
  
  // Filter out flex-related styles from the style prop for the inner container
  let innerStyle: ViewStyle | undefined;
  if (style && typeof style === 'object') {
    const { flex, flexGrow, flexShrink, flexBasis, alignSelf, ...rest } = style as ViewStyle & { flex?: number; flexGrow?: number; flexShrink?: number; flexBasis?: number | string };
    
    // Apply flex styles to outer wrapper
    if (flex !== undefined) {
      outerStyle.flex = flex;
      // When flex is used, ensure the wrapper stretches in cross-axis
      if (alignSelf === undefined) outerStyle.alignSelf = 'stretch';
    }
    if (flexGrow !== undefined) outerStyle.flexGrow = flexGrow;
    if (flexShrink !== undefined) outerStyle.flexShrink = flexShrink;
    if (flexBasis !== undefined) outerStyle.flexBasis = flexBasis;
    if (alignSelf !== undefined) outerStyle.alignSelf = alignSelf;
    
    // Keep non-flex styles for inner container
    innerStyle = Object.keys(rest).length > 0 ? rest : undefined;
  }
  
  if (fullWidth) {
    outerStyle.width = '100%';
  }

  const containerStyle: (ViewStyle | false | undefined)[] = [
    styles.container,
    variantStyles[variant].container,
    sizeStyles[size].container,
    fullWidth && styles.fullWidth,
    // When outer has flex, inner should fill it
    hasFlexStyle && styles.fillParent,
    innerStyle,
  ];

  const textStyle: (TextStyle | undefined)[] = [
    styles.text,
    variantStyles[variant].text,
    sizeStyles[size].text,
  ];

  return (
    <Animated.View style={outerStyle}>
      <TouchableOpacity
        style={containerStyle}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.8}
        testID={testID}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variantStyles[variant].text.color}
          />
        ) : (
          <Text style={textStyle}>{children}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  fillParent: {
    flex: 1,
  },
  text: {
    textAlign: 'center',
  },
});

