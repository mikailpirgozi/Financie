import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { FileText, Calendar, LayoutDashboard, StickyNote } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../contexts';

export type LoanDetailTab = 'overview' | 'schedule' | 'documents' | 'notes';

interface TabItem {
  id: LoanDetailTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}

interface LoanDetailTabsProps {
  activeTab: LoanDetailTab;
  onTabChange: (tab: LoanDetailTab) => void;
  overdueCount?: number;
  documentsCount?: number;
  notesCount?: number;
  /** Hide the dedicated notes tab (e.g. when notes are shown inline). */
  hideNotesTab?: boolean;
  /** Horizontal padding applied to the tabs row (defaults to 16). */
  horizontalPadding?: number;
}

export function LoanDetailTabs({
  activeTab,
  onTabChange,
  overdueCount = 0,
  documentsCount = 0,
  notesCount = 0,
  hideNotesTab = false,
  horizontalPadding = 16,
}: LoanDetailTabsProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width: windowWidth } = useWindowDimensions();

  const tabs = useMemo<TabItem[]>(() => {
    const base: TabItem[] = [
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
        badgeColor: colors.danger,
      },
      {
        id: 'documents',
        label: 'Dokumenty',
        icon: <FileText size={18} />,
        badge: documentsCount > 0 ? documentsCount : undefined,
        badgeColor: colors.primary,
      },
    ];
    if (!hideNotesTab) {
      base.push({
        id: 'notes',
        label: 'Poznámky',
        icon: <StickyNote size={18} />,
        badge: notesCount > 0 ? notesCount : undefined,
        badgeColor: colors.info ?? colors.primary,
      });
    }
    return base;
  }, [overdueCount, documentsCount, notesCount, hideNotesTab, colors]);

  const tabWidth = useMemo(
    () => Math.max((windowWidth - horizontalPadding * 2) / tabs.length, 60),
    [windowWidth, horizontalPadding, tabs.length]
  );

  const indicatorPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const tabIndex = tabs.findIndex((tab) => tab.id === activeTab);
    Animated.spring(indicatorPosition, {
      toValue: Math.max(tabIndex, 0) * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [activeTab, tabs, tabWidth, indicatorPosition]);

  const handleTabPress = (tab: LoanDetailTab) => {
    if (tab !== activeTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onTabChange(tab);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <View style={[styles.tabsRow, { paddingHorizontal: horizontalPadding }]}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, { width: tabWidth }]}
              onPress={() => handleTabPress(tab.id)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
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
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <View
                    style={[styles.badge, { backgroundColor: tab.badgeColor ?? colors.primary }]}
                    accessibilityLabel={`${tab.badge} upozornení`}
                  >
                    <Text style={[styles.badgeText, { color: colors.textInverse ?? '#fff' }]}>
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: colors.primary,
            width: Math.max(tabWidth - 24, 24),
            transform: [{ translateX: Animated.add(indicatorPosition, horizontalPadding + 12) }],
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
  },
  tab: {
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
  },
  indicator: {
    height: 3,
    borderRadius: 1.5,
    marginBottom: 0,
  },
});
