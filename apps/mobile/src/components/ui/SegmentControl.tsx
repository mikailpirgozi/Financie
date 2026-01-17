import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = true,
}: SegmentControlProps<T>) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const translateX = useRef(new Animated.Value(4)).current; // Start at padding offset
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const [segmentWidths, setSegmentWidths] = useState<number[]>([]);

  // Update animation when selection changes
  useEffect(() => {
    if (segmentWidths.length > 0 && selectedIndex >= 0) {
      // Calculate offset including container padding (4px)
      let offset = 4;
      for (let i = 0; i < selectedIndex; i++) {
        offset += segmentWidths[i] || 0;
      }
      // Note: width is not supported by native driver, so we use JS driver for both
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: offset,
          useNativeDriver: false,
        }),
        Animated.spring(indicatorWidth, {
          toValue: segmentWidths[selectedIndex] || 0,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [selectedIndex, segmentWidths]);

  const handleLayout = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout;
      setSegmentWidths((prev) => {
        const newWidths = [...prev];
        newWidths[index] = width;
        return newWidths;
      });
    },
    []
  );

  const handlePress = useCallback(
    (optionValue: T) => {
      if (optionValue !== value) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange(optionValue);
      }
    },
    [value, onChange]
  );

  const sizeStyles = getSizeStyles(size);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfacePressed, borderColor: colors.border },
        fullWidth && styles.fullWidth,
      ]}
    >
      {/* Animated indicator */}
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: colors.surface },
          {
            left: translateX,
            width: indicatorWidth,
          },
        ]}
      />

      {/* Segment options */}
      {options.map((option, index) => {
        const isSelected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onLayout={handleLayout(index)}
            onPress={() => handlePress(option.value)}
            style={[styles.segment, fullWidth && styles.segmentFullWidth]}
          >
            <View style={[styles.segmentContent, sizeStyles.padding]}>
              <Text
                style={[
                  styles.label,
                  sizeStyles.fontSize,
                  {
                    color: isSelected ? colors.text : colors.textSecondary,
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}
              >
                {option.label}
              </Text>
              {option.count !== undefined && (
                <Text
                  style={[
                    styles.count,
                    sizeStyles.countSize,
                    {
                      color: isSelected ? colors.primary : colors.textMuted,
                    },
                  ]}
                >
                  {option.count}
                </Text>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function getSizeStyles(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return {
        padding: { paddingVertical: 6, paddingHorizontal: 12 },
        fontSize: { fontSize: 12 },
        countSize: { fontSize: 10 },
      };
    case 'lg':
      return {
        padding: { paddingVertical: 12, paddingHorizontal: 20 },
        fontSize: { fontSize: 16 },
        countSize: { fontSize: 14 },
      };
    default:
      return {
        padding: { paddingVertical: 10, paddingHorizontal: 16 },
        fontSize: { fontSize: 14 },
        countSize: { fontSize: 12 },
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    position: 'relative',
  },
  fullWidth: {
    width: '100%',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segment: {
    zIndex: 1,
  },
  segmentFullWidth: {
    flex: 1,
  },
  segmentContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
  count: {
    marginTop: 2,
    fontWeight: '700',
  },
});
