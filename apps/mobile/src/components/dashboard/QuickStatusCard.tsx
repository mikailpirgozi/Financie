import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

interface MetricItem {
  label: string;
  value: string;
  color?: string;
}

interface QuickStatusCardProps {
  title: string;
  icon: React.ReactNode;
  iconBackgroundColor?: string;
  mainValue: string;
  mainLabel: string;
  metrics?: MetricItem[];
  badge?: {
    text: string;
    color: string;
    backgroundColor: string;
  };
  footer?: {
    label: string;
    value: string;
    highlight?: boolean;
  };
  onPress: () => void;
}

export function QuickStatusCard({
  title,
  icon,
  iconBackgroundColor,
  mainValue,
  mainLabel,
  metrics = [],
  badge,
  footer,
  onPress,
}: QuickStatusCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconBackgroundColor || colors.primaryLight },
            ]}
          >
            {icon}
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
          </View>
        )}
      </View>

      {/* Main Value */}
      <View style={styles.mainSection}>
        <Text style={[styles.mainValue, { color: colors.text }]}>{mainValue}</Text>
        <Text style={[styles.mainLabel, { color: colors.textSecondary }]}>{mainLabel}</Text>
      </View>

      {/* Metrics */}
      {metrics.length > 0 && (
        <View style={[styles.metricsRow, { borderTopColor: colors.borderLight }]}>
          {metrics.map((metric, index) => (
            <View
              key={index}
              style={[
                styles.metricItem,
                index < metrics.length - 1 && {
                  borderRightWidth: 1,
                  borderRightColor: colors.borderLight,
                },
              ]}
            >
              <Text
                style={[styles.metricValue, { color: metric.color || colors.text }]}
                numberOfLines={1}
              >
                {metric.value}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {metric.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Footer */}
      {footer && (
        <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
          <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>
            {footer.label}
          </Text>
          <View style={styles.footerRight}>
            <Text
              style={[
                styles.footerValue,
                {
                  color: footer.highlight ? colors.primary : colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {footer.value}
            </Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainSection: {
    marginBottom: 16,
  },
  mainValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  mainLabel: {
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  metricItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  footerLabel: {
    fontSize: 13,
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});
