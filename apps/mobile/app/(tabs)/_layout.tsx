import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0070f3',
        tabBarInactiveTintColor: '#8B5CF6',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: () => <Text>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: 'Úvery',
          tabBarIcon: () => <Text>💰</Text>,
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Majetok',
          tabBarIcon: () => <Text>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Výdavky',
          tabBarIcon: () => <Text>💸</Text>,
        }}
      />
      <Tabs.Screen
        name="incomes"
        options={{
          title: 'Príjmy',
          tabBarIcon: () => <Text>💵</Text>,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Kategórie',
          tabBarIcon: () => <Text>🏷️</Text>,
        }}
      />
      <Tabs.Screen
        name="summaries"
        options={{
          title: 'Súhrny',
          tabBarIcon: () => <Text>📈</Text>,
        }}
      />
      <Tabs.Screen
        name="household"
        options={{
          title: 'Domácnosť',
          tabBarIcon: () => <Text>👥</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Nastavenia',
          tabBarIcon: () => <Text>⚙️</Text>,
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: 'Pravidlá',
          tabBarIcon: () => <Text>⚡</Text>,
          href: null,
        }}
      />
      <Tabs.Screen
        name="audit"
        options={{
          title: 'Audit Log',
          tabBarIcon: () => <Text>📝</Text>,
          href: null,
        }}
      />
    </Tabs>
  );
}

