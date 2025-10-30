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
    </Tabs>
  );
}

