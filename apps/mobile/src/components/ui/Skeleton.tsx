import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const widthValue: number | `${number}%` | 'auto' = typeof width === 'number' 
    ? width 
    : width === '100%' 
    ? '100%' 
    : typeof width === 'string' && width.endsWith('%')
    ? width as `${number}%`
    : 'auto';
  
  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: widthValue,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

interface SkeletonGroupProps {
  count?: number;
  spacing?: number;
  children?: React.ReactNode;
}

export function SkeletonGroup({
  count = 3,
  spacing = 12,
  children,
}: SkeletonGroupProps) {
  if (children) {
    return (
      <View style={{ gap: spacing }}>
        {children}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing }}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} />
      ))}
    </View>
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Skeleton width="100%" height={12} />
        <Skeleton width="90%" height={12} style={{ marginTop: 8 }} />
        <Skeleton width="95%" height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#e5e7eb',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  cardBody: {
    gap: 8,
  },
});

