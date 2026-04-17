import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export type VehicleDetailTab =
  | 'overview'
  | 'insurances'
  | 'documents'
  | 'service'
  | 'fines'
  | 'loans'
  | 'files';

export interface VehicleDetailTabConfig {
  id: VehicleDetailTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
  alert?: boolean;
}

interface VehicleDetailTabsProps {
  activeTab: VehicleDetailTab;
  onTabChange: (tab: VehicleDetailTab) => void;
  tabs: VehicleDetailTabConfig[];
}

export function VehicleDetailTabs({ activeTab, onTabChange, tabs }: VehicleDetailTabsProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={[styles.scroll, { borderBottomColor: colors.border }]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, isActive && { borderBottomColor: colors.primary }]}
            onPress={() => onTabChange(tab.id)}
            activeOpacity={0.7}
          >
            <View style={styles.tabContent}>
              <Ionicons
                name={tab.icon}
                size={16}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[styles.label, { color: isActive ? colors.primary : colors.textSecondary }]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: tab.alert
                        ? colors.error
                        : isActive
                          ? colors.primary
                          : colors.surfacePressed,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color: tab.alert || isActive ? '#fff' : colors.textSecondary,
                      },
                    ]}
                  >
                    {tab.badge}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    borderBottomWidth: 1,
    flexGrow: 0,
  },
  container: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
