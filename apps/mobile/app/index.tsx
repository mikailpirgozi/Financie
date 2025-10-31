import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync } from '../src/lib/notifications';

export default function HomeScreen() {
  const [expoPushToken, setExpoPushToken] = useState<string>('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const router = useRouter();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        setExpoPushToken(token);
        // TODO: Get user ID from auth and save token
        // savePushToken(token, userId);
      }
    });

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Listen for notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FinApp</Text>
      <Text style={styles.subtitle}>Inteligentná správa osobných financií</Text>

      {expoPushToken && (
        <View style={styles.tokenContainer}>
          <Text style={styles.tokenLabel}>Push Token:</Text>
          <Text style={styles.token} numberOfLines={2}>
            {expoPushToken}
          </Text>
        </View>
      )}

      {notification && (
        <View style={styles.notificationContainer}>
          <Text style={styles.notificationTitle}>Posledná notifikácia:</Text>
          <Text style={styles.notificationText}>
            {notification.request.content.title}
          </Text>
          <Text style={styles.notificationBody}>
            {notification.request.content.body}
          </Text>
        </View>
      )}

      <View style={styles.features}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>💰</Text>
          <Text style={styles.featureTitle}>Úvery</Text>
          <Text style={styles.featureText}>
            Presné výpočty splátok s automatickým harmonogramom
          </Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureTitle}>Výdavky & Príjmy</Text>
          <Text style={styles.featureText}>
            Kategorizácia a mesačné prehľady
          </Text>
        </View>

        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🏠</Text>
          <Text style={styles.featureTitle}>Majetok</Text>
          <Text style={styles.featureText}>
            Sledovanie hodnoty a automatické preceňovanie
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={() => router.push('/auth/login')}>
        <Text style={styles.startButtonText}>Začať</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#8B5CF6',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  tokenContainer: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '100%',
  },
  tokenLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#666',
  },
  token: {
    fontSize: 10,
    color: '#333',
    fontFamily: 'monospace',
  },
  notificationContainer: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    width: '100%',
  },
  notificationTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    color: '#0369a1',
  },
  notificationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0c4a6e',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 12,
    color: '#075985',
  },
  features: {
    marginTop: 32,
    width: '100%',
  },
  feature: {
    marginBottom: 24,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  startButton: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    alignSelf: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
