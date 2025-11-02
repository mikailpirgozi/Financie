import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface LoanScheduleEntry {
  id: string;
  loan_id: string;
  installment_no: number;
  due_date: string;
  total_due: string;
  status: 'pending' | 'paid' | 'overdue';
}

interface Loan {
  id: string;
  lender: string;
}

/**
 * Register for push notifications and save token to database
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert(
        'Chyba',
        'Povolte notifikácie v nastaveniach pre prijímanie pripomienok splátok'
      );
      return null;
    }

    // Get Expo push token
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Save token to database
    await savePushToken(token);

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('loan-reminders', {
        name: 'Pripomienky splátok',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#f59e0b',
      });
    }

    return token;
  } catch (error) {
    console.error('Failed to register for push notifications:', error);
    return null;
  }
}

/**
 * Save push token to database
 */
async function savePushToken(token: string): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: user.id,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

    if (error) {
      console.error('Failed to save push token:', error);
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Schedule local notifications for upcoming loan installments
 */
export async function scheduleLoanReminders(
  loans: Loan[],
  schedules: LoanScheduleEntry[]
): Promise<void> {
  try {
    // Cancel all existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const entry of schedules) {
      if (entry.status === 'paid') continue;

      const loan = loans.find((l) => l.id === entry.loan_id);
      if (!loan) continue;

      const dueDate = new Date(entry.due_date);
      dueDate.setHours(9, 0, 0, 0); // 9:00 AM

      const daysUntil = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Notification 3 days before due date
      if (daysUntil === 3) {
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - 3);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🔔 Pripomienka splátky',
            body: `O 3 dni je splatná splátka ${loan.lender} vo výške ${formatCurrency(entry.total_due)}`,
            data: { loanId: entry.loan_id, installmentId: entry.id, type: 'reminder' },
            sound: true,
          },
          trigger: {
            date: reminderDate,
            channelId: 'loan-reminders',
          },
        });
      }

      // Notification on due date
      if (daysUntil === 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Dnes je splatnosť!',
            body: `Dnes by ste mali zaplatiť splátku ${loan.lender} vo výške ${formatCurrency(entry.total_due)}`,
            data: { loanId: entry.loan_id, installmentId: entry.id, type: 'due_today' },
            sound: true,
          },
          trigger: {
            date: dueDate,
            channelId: 'loan-reminders',
          },
        });
      }

      // Immediate notification for overdue
      if (daysUntil < 0 && entry.status === 'overdue') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 Splátka po splatnosti!',
            body: `Splátka ${loan.lender} vo výške ${formatCurrency(entry.total_due)} je ${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'deň' : 'dní'} po splatnosti`,
            data: { loanId: entry.loan_id, installmentId: entry.id, type: 'overdue' },
            sound: true,
          },
          trigger: null, // Immediate
        });
      }
    }

    console.log('✅ Loan reminders scheduled successfully');
  } catch (error) {
    console.error('Failed to schedule loan reminders:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Format currency for notifications
 */
function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 €';
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}
