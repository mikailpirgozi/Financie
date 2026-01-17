import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, FileWarning, Receipt, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';

export interface AlertItem {
  type: 'overdue_loans' | 'expired_docs' | 'expiring_docs' | 'unpaid_fines';
  count: number;
  message: string;
  onPress: () => void;
}

interface AlertsBannerProps {
  alerts: AlertItem[];
}

const ALERT_CONFIG: Record<AlertItem['type'], { icon: typeof AlertTriangle; priority: number }> = {
  overdue_loans: {
    icon: AlertTriangle,
    priority: 1,
  },
  expired_docs: {
    icon: FileWarning,
    priority: 2, // Expired docs are high priority
  },
  expiring_docs: {
    icon: FileWarning,
    priority: 3,
  },
  unpaid_fines: {
    icon: Receipt,
    priority: 4,
  },
};

export function AlertsBanner({ alerts }: AlertsBannerProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  // Filter alerts with count > 0 and sort by priority
  const activeAlerts = alerts
    .filter(alert => alert.count > 0)
    .sort((a, b) => ALERT_CONFIG[a.type].priority - ALERT_CONFIG[b.type].priority);

  if (activeAlerts.length === 0) {
    return null;
  }

  const handlePress = (alert: AlertItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    alert.onPress();
  };

  const getAlertColors = (type: AlertItem['type']) => {
    switch (type) {
      case 'overdue_loans':
      case 'expired_docs': // Expired docs are critical - use danger color
        return {
          background: colors.dangerLight,
          border: colors.danger,
          text: colors.danger,
        };
      case 'expiring_docs':
        return {
          background: colors.warningLight,
          border: colors.warning,
          text: colors.warning,
        };
      case 'unpaid_fines':
        return {
          background: colors.infoLight,
          border: colors.info,
          text: colors.info,
        };
    }
  };

  return (
    <View style={styles.container}>
      {activeAlerts.map((alert, index) => {
        const alertColors = getAlertColors(alert.type);
        const IconComponent = ALERT_CONFIG[alert.type].icon;

        return (
          <TouchableOpacity
            key={alert.type}
            style={[
              styles.alertCard,
              {
                backgroundColor: alertColors.background,
                borderLeftColor: alertColors.border,
              },
              index < activeAlerts.length - 1 && styles.alertCardSpacing,
            ]}
            onPress={() => handlePress(alert)}
            activeOpacity={0.7}
          >
            <View style={styles.alertContent}>
              <IconComponent size={24} color={alertColors.text} style={styles.icon} />
              <View style={styles.textContainer}>
                <Text style={[styles.alertCount, { color: alertColors.text }]}>
                  {alert.count}
                </Text>
                <Text style={[styles.alertMessage, { color: alertColors.text }]} numberOfLines={1}>
                  {alert.message}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={alertColors.text} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  alertCardSpacing: {
    marginBottom: 8,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  alertMessage: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
