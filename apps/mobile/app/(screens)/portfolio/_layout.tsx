import { Stack } from 'expo-router';

export default function PortfolioLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f5f5f5' },
      }}
    >
      <Stack.Screen name="calendar" />
    </Stack>
  );
}

