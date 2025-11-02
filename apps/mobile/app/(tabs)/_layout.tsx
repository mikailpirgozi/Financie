import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Wallet, ShoppingCart, DollarSign, MoreHorizontal } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { getCurrentHousehold } from '../../src/lib/api';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    const fetchOverdueCount = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const household = await getCurrentHousehold();
        const { data, error } = await supabase
          .rpc('count_overdue_installments', { p_household_id: household.id });

        if (!error && data !== null) {
          setOverdueCount(data);
        }
      } catch (err) {
        console.warn('Failed to fetch overdue count:', err);
      }
    };

    fetchOverdueCount();

    // Realtime subscription for loan_schedules changes
    const channel = supabase
      .channel('overdue-badges')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'loan_schedules' },
        fetchOverdueCount
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
          href: '/(tabs)',
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Úvery',
          tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
          tabBarBadge: overdueCount > 0 ? overdueCount : undefined,
          href: '/(tabs)/loans',
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Výdavky',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
          href: '/(tabs)/expenses',
        }}
      />
      <Tabs.Screen
        name="incomes"
        options={{
          title: 'Príjmy',
          tabBarIcon: ({ color, size }) => <DollarSign size={size} color={color} />,
          href: '/(tabs)/incomes',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Viac',
          tabBarIcon: ({ color, size }) => <MoreHorizontal size={size} color={color} />,
          href: '/(tabs)/settings',
        }}
      />
      {/* Explicitly hide all nested routes from tab bar */}
      <Tabs.Screen name="loans/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="loans/[id]/edit" options={{ href: null }} />
      <Tabs.Screen name="loans/[id]/pay" options={{ href: null }} />
      <Tabs.Screen name="loans/[id]/simulate" options={{ href: null }} />
      <Tabs.Screen name="loans/[id]/early-repayment" options={{ href: null }} />
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
    </Tabs>
  );
}


