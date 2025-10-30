import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface DashboardKPICardProps {
  title: string;
  value: string;
  change?: string;
  subtitle?: string;
  icon?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function DashboardKPICard({
  title,
  value,
  change,
  subtitle,
  icon,
  color = '#0070f3',
  trend = 'neutral',
}: DashboardKPICardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return '#10b981';
    if (trend === 'down') return '#ef4444';
    return '#6b7280';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↑';
    if (trend === 'down') return '↓';
    return '';
  };

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.header}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {(change || subtitle) && (
        <View style={styles.footer}>
          {change && (
            <Text style={[styles.change, { color: getTrendColor() }]}>
              {getTrendIcon()} {change}
            </Text>
          )}
          {subtitle && !change && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  footer: {
    marginTop: 4,
  },
  change: {
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

