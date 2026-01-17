import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { FileText, Calendar, LayoutDashboard } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';

export type LoanDetailTab = 'overview' | 'schedule' | 'documents';

interface TabItem {
  id: LoanDetailTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface LoanDetailTabsProps {
  activeTab: LoanDetailTab;
  onTabChange: (tab: LoanDetailTab) => void;
  overdueCount?: number;
  documentsCount?: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_COUNT = 3;
const TAB_WIDTH = (SCREEN_WIDTH - 32) / TAB_COUNT;

export function LoanDetailTabs({
  activeTab,
  onTabChange,
  overdueCount = 0,
  documentsCount = 0,
}: LoanDetailTabsProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  
  const indicatorPosition = useRef(new Animated.Value(0)).current;

  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: 'Prehľad',
      icon: <LayoutDashboard size={18} />,
    },
    {
      id: 'schedule',
      label: 'Splátky',
      icon: <Calendar size={18} />,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
    {
      id: 'documents',
      label: 'Dokumenty',
      icon: <FileText size={18} />,
      badge: documentsCount > 0 ? documentsCount : undefined,
    },
  ];

  useEffect(() => {
    const tabIndex = tabs.findIndex((tab) => tab.id === activeTab);
    Animated.spring(indicatorPosition, {
      toValue: tabIndex * TAB_WIDTH,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [activeTab]);

  const handleTabPress = (tab: LoanDetailTab) => {
    if (tab !== activeTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTabChange(tab);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                {React.cloneElement(tab.icon as React.ReactElement<{ color: string }>, {
                  color: isActive ? colors.primary : colors.textMuted,
                })}
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? colors.primary : colors.textMuted },
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          tab.id === 'schedule' ? colors.danger : colors.primary,
                      },
                    ]}
                  >
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Animated indicator */}
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: colors.primary,
            width: TAB_WIDTH - 24,
            transform: [{ translateX: Animated.add(indicatorPosition, 12) }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
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
    color: '#ffffff',
  },
  indicator: {
    height: 3,
    borderRadius: 1.5,
    marginBottom: 0,
  },
});
