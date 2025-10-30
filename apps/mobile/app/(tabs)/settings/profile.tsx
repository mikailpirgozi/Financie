import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '../../../../src/components/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
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

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const profileInfo: UserProfile = {
        id: user.id,
        email: user.email || '',
        full_name: profileData?.full_name || null,
        avatar_url: profileData?.avatar_url || null,
      };

      setProfile(profileInfo);
      setFullName(profileData?.full_name || '');
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

  const handleUpdateProfile = async () => {
    try {
      setUpdating(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName.trim() || null })
        .eq('id', user?.id);

      if (error) throw error;

      showToast('Profil bol aktualizovaný', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadProfile();
    } catch (error) {
      showToast('Nepodarilo sa aktualizovať profil', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUpdating(false);
    }
  };

  const getInitials = (): string => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return profile?.email?.slice(0, 2).toUpperCase() || '??';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Načítavam profil..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil</Text>
          <Text style={styles.subtitle}>Upravte svoje osobné údaje</Text>
        </View>

        <View style={styles.content}>
          {/* Avatar Section */}
          <Card style={styles.avatarCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            <TouchableOpacity style={styles.changeAvatarButton}>
              <Text style={styles.changeAvatarText}>Zmeniť fotografiu</Text>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>(Zatiaľ nie je k dispozícii)</Text>
          </Card>

          {/* Profile Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Celé meno</Text>
              <Input
                placeholder="Ján Novák"
                value={fullName}
                onChangeText={setFullName}
                style={styles.input}
              />
              <Text style={styles.hint}>
                Toto meno sa zobrazí ostatným členom domácnosti
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValue}>{profile?.email}</Text>
              </View>
              <Text style={styles.hint}>Email nemožno zmeniť</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>ID používateľa</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValueMono}>{profile?.id}</Text>
              </View>
            </View>
          </View>

          {/* Account Info */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ Informácie o účte</Text>
            <Text style={styles.infoText}>
              Pre zmenu emailu alebo hesla kontaktujte podporu alebo použite webovú aplikáciu.
            </Text>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          onPress={handleUpdateProfile}
          loading={updating}
          disabled={updating}
          fullWidth
        >
          Uložiť zmeny
        </Button>
        <Button
          onPress={() => router.back()}
          variant="outline"
          fullWidth
        >
          Späť
        </Button>
      </View>

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
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    padding: 16,
    paddingBottom: 150,
  },
  avatarCard: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
  },
  changeAvatarButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  changeAvatarText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  avatarHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  form: {
    marginBottom: 24,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  readOnlyField: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
  },
  readOnlyValue: {
    fontSize: 16,
    color: '#6b7280',
  },
  readOnlyValueMono: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
});

