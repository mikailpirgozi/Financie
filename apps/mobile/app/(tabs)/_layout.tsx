import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: () => '📊',
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Úvery',
          tabBarIcon: () => '💰',
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Majetok',
          tabBarIcon: () => '🏠',
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Výdavky',
          tabBarIcon: () => '💸',
        }}
      />
      <Tabs.Screen
        name="incomes"
        options={{
          title: 'Príjmy',
          tabBarIcon: () => '💵',
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Kategórie',
          tabBarIcon: () => '🏷️',
        }}
      />
      <Tabs.Screen
        name="summaries"
        options={{
          title: 'Súhrny',
          tabBarIcon: () => '📈',
        }}
      />
      <Tabs.Screen
        name="household"
        options={{
          title: 'Domácnosť',
          tabBarIcon: () => '👥',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Nastavenia',
          tabBarIcon: () => '⚙️',
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: 'Pravidlá',
          tabBarIcon: () => '⚡',
          href: null,
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit Log',
          tabBarIcon: () => '📝',
          href: null,
        }}
      />
    </Tabs>
  );
}

