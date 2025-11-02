import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';

export default function ScreensLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Späť',
        headerTintColor: '#8b5cf6',
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerShadowVisible: true,
        headerTitleStyle: {
          fontSize: 20,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="assets" 
        options={{ 
          headerTitle: 'Majetok',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(screens)/assets/new')}
              style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f59e0b', borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>+ Pridať</Text>
            </TouchableOpacity>
          ),
        }} 
      />
      <Stack.Screen 
        name="categories" 
        options={{ 
          headerTitle: 'Kategórie',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(screens)/categories/new')}
              style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#8b5cf6', borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>+ Pridať</Text>
            </TouchableOpacity>
          ),
        }} 
      />
      <Stack.Screen 
        name="summaries" 
        options={{ 
          headerTitle: 'Mesačné súhrny',
        }} 
      />
      <Stack.Screen 
        name="household" 
        options={{ 
          headerTitle: 'Domácnosť',
        }} 
      />
      <Stack.Screen 
        name="rules" 
        options={{ 
          headerTitle: 'Pravidlá',
        }} 
      />
      <Stack.Screen 
        name="audit" 
        options={{ 
          headerTitle: 'Audit Log',
        }} 
      />
    </Stack>
  );
}

