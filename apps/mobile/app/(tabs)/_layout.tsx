import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
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
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
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
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📊</Text>,
          href: '/(tabs)',
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Úvery',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💰</Text>,
          href: '/(tabs)/loans',
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Výdavky',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💸</Text>,
          href: '/(tabs)/expenses',
        }}
      />
      <Tabs.Screen
        name="incomes"
        options={{
          title: 'Príjmy',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💵</Text>,
          href: '/(tabs)/incomes',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Viac',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>⋯</Text>,
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


