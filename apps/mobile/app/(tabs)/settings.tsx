import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nie ste prihlásený');

      // Fetch user profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile({
        id: user.id,
        email: user.email || '',
        full_name: profileData?.full_name || null,
        avatar_url: profileData?.avatar_url || null,
      });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa načítať profil',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const handleLogout = () => {
    Alert.alert(
      'Odhlásiť sa',
      'Naozaj sa chcete odhlásiť?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Odhlásiť',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              showToast('Boli ste úspešne odhlásený', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Navigation back to auth handled by auth state listener
            } catch (error) {
              showToast('Nepodarilo sa odhlásiť', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </View>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : profile?.email?.slice(0, 2).toUpperCase() || '??';

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Profile Card */}
          <Card style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
            <Text style={styles.name}>{profile?.full_name || 'Používateľ'}</Text>
            <Text style={styles.email}>{profile?.email}</Text>
          </Card>

          {/* Settings Sections */}
          <Text style={styles.sectionTitle}>Nastavenia</Text>

          <Card style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/settings/profile')}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>👤</Text>
                <Text style={styles.menuLabel}>Profil</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/settings/notifications')}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>🔔</Text>
                <Text style={styles.menuLabel}>Notifikácie</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/settings/language')}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>🌍</Text>
                <Text style={styles.menuLabel}>Jazyk</Text>
              </View>
              <View style={styles.menuRight}>
                <Badge variant="default">Slovenčina</Badge>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          </Card>

          <Text style={styles.sectionTitle}>Informácie</Text>

          <Card style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/settings/about')}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>ℹ️</Text>
                <Text style={styles.menuLabel}>O aplikácii</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/settings/help')}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>❓</Text>
                <Text style={styles.menuLabel}>Pomoc</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(tabs)/settings/privacy')}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>🔒</Text>
                <Text style={styles.menuLabel}>Ochrana súkromia</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </Card>

          <View style={styles.logoutSection}>
            <Button
              onPress={handleLogout}
              variant="destructive"
              fullWidth
            >
              Odhlásiť sa
            </Button>
          </View>

          <View style={styles.versionSection}>
            <Text style={styles.versionText}>Verzia 1.0.0</Text>
            <Text style={styles.versionSubtext}>© 2024 Financie App</Text>
          </View>
        </View>
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast({ ...toast, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0070f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuCard: {
    padding: 0,
    marginBottom: 24,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chevron: {
    fontSize: 20,
    color: '#9ca3af',
  },
  logoutSection: {
    marginTop: 16,
  },
  versionSection: {
    alignItems: 'center',
    marginTop: 32,
  },
  versionText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 11,
    color: '#d1d5db',
  },
});

