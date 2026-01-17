import { Tabs } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Wallet, FileText, Car, MoreHorizontal } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { getCurrentHousehold } from '../../src/lib/api';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [overdueCount, setOverdueCount] = useState(0);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  // Fetch household once on mount
  useEffect(() => {
    let isMounted = true;
    
    const fetchHousehold = async () => {
      try {
        const household = await getCurrentHousehold();
        if (isMounted) {
          setHouseholdId(household.id);
        }
      } catch (err) {
        // Silent fail - household will be null
      }
    };

    fetchHousehold();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced fetch - non-blocking
  const fetchOverdueCount = useCallback(async () => {
    if (!householdId) return;
    
    // Run in background, don't block UI
    setTimeout(async () => {
      try {
        const { data } = await supabase
          .rpc('count_overdue_installments', { p_household_id: householdId });

        if (data !== null) {
          setOverdueCount(data);
        }
      } catch {
        // Silent fail
      }
    }, 0);
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;

    fetchOverdueCount();

    // Realtime subscription - throttled
    let lastUpdate = Date.now();
    const channel = supabase
      .channel('overdue-badges')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'loan_schedules' },
        () => {
          const now = Date.now();
          // Throttle updates to max 1 per 3 seconds
          if (now - lastUpdate > 3000) {
            lastUpdate = now;
            fetchOverdueCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [householdId, fetchOverdueCount]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 65 + insets.bottom : 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
          href: '/(tabs)',
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Úvery',
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
          tabBarBadge: overdueCount > 0 ? overdueCount : undefined,
          href: '/(tabs)/loans',
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Vozidlá',
          tabBarIcon: ({ color, size }) => <Car color={color} size={size} />,
          href: '/(tabs)/vehicles',
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Dokumenty',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
          href: '/(tabs)/documents',
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Výdavky',
          href: null, // Hidden from tab bar, accessible via settings
        }}
      />
      <Tabs.Screen
        name="incomes"
        options={{
          title: 'Príjmy',
          href: null, // Hidden from tab bar, accessible via settings
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Viac',
          tabBarIcon: ({ color, size }) => <MoreHorizontal color={color} size={size} />,
          href: '/(tabs)/settings',
        }}
      />
      {/* Explicitly hide all nested routes from tab bar */}
      <Tabs.Screen name="loans/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="loans/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="loans/[id]/pay" options={{ href: null }} />
      <Tabs.Screen name="loans/[id]/simulate" options={{ href: null }} />
      <Tabs.Screen name="loans/[id]/early-repayment" options={{ href: null }} />
      <Tabs.Screen name="loans/[id]/link-asset" options={{ href: null }} />
      <Tabs.Screen name="loans/new" options={{ href: null }} />
      <Tabs.Screen name="expenses/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="expenses/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="expenses/new" options={{ href: null }} />
      <Tabs.Screen name="incomes/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="incomes/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="incomes/new" options={{ href: null }} />
      <Tabs.Screen name="incomes/templates" options={{ href: null }} />
      <Tabs.Screen name="incomes/templates/new" options={{ href: null }} />
      <Tabs.Screen name="settings/profile" options={{ href: null }} />
      <Tabs.Screen name="settings/notifications" options={{ href: null }} />
      <Tabs.Screen name="settings/language" options={{ href: null }} />
      <Tabs.Screen name="settings/about" options={{ href: null }} />
      <Tabs.Screen name="settings/help" options={{ href: null }} />
      <Tabs.Screen name="settings/privacy" options={{ href: null }} />
      <Tabs.Screen name="settings/subscription" options={{ href: null }} />
      <Tabs.Screen name="vehicles/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="vehicles/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="vehicles/new" options={{ href: null }} />
    </Tabs>
  );
}


