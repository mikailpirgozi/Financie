import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getCurrentHousehold } from '../../../src/lib/api';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { Card } from '@/components/ui/Card';
import * as Haptics from 'expo-haptics';

type Role = 'admin' | 'member' | 'viewer';

export default function InviteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const validateForm = (): boolean => {
    if (!email.trim()) {
      showToast('Zadajte email adresu', 'error');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast('Zadajte platnú email adresu', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const household = await getCurrentHousehold();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/household/invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            household_id: household.id,
            email: email.trim().toLowerCase(),
            role,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Nepodarilo sa odoslať pozvánku' }));
        throw new Error(error.error || error.message || 'Nepodarilo sa odoslať pozvánku');
      }

      showToast('Pozvánka bola odoslaná', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Nepodarilo sa odoslať pozvánku',
        'error'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: { value: Role; label: string; icon: string; description: string }[] = [
    { 
      value: 'admin', 
      label: 'Administrátor', 
      icon: '👑',
      description: 'Plný prístup, môže upravovať nastavenia a pozývať členov'
    },
    { 
      value: 'member', 
      label: 'Člen', 
      icon: '👤',
      description: 'Môže pridávať a upravovať záznamy'
    },
    { 
      value: 'viewer', 
      label: 'Pozorovateľ', 
      icon: '👁️',
      description: 'Len čítací prístup k dátam'
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Pozvať člena</Text>
          <Text style={styles.subtitle}>
            Pridajte nového člena do domácnosti
          </Text>
        </View>

        <View style={styles.form}>
          {/* Email */}
          <View style={styles.section}>
            <Text style={styles.label}>Email adresa</Text>
            <Input
              placeholder="jan.novak@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={styles.hint}>
              Používateľ dostane pozvánku na túto email adresu
            </Text>
          </View>

          {/* Role */}
          <View style={styles.section}>
            <Text style={styles.label}>Rola v domácnosti</Text>
            <View style={styles.roleList}>
              {roleOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.roleOption,
                    role === option.value && styles.roleOptionSelected,
                  ]}
                  onPress={() => {
                    setRole(option.value);
                    Haptics.selectionAsync();
                  }}
                >
                  <View style={styles.roleHeader}>
                    <Text style={styles.roleIcon}>{option.icon}</Text>
                    <Text
                      style={[
                        styles.roleLabel,
                        role === option.value && styles.roleLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {role === option.value && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </View>
                  <Text style={styles.roleDescription}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Info Card */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ Práva rolí</Text>
            <View style={styles.infoList}>
              <Text style={styles.infoItem}>
                <Text style={styles.infoBold}>Administrátor:</Text> Môže pozývať členov, upravovať nastavenia domácnosti a všetky záznamy
              </Text>
              <Text style={styles.infoItem}>
                <Text style={styles.infoBold}>Člen:</Text> Môže vytvárať, upravovať a mazať vlastné záznamy (výdavky, príjmy, úvery)
              </Text>
              <Text style={styles.infoItem}>
                <Text style={styles.infoBold}>Pozorovateľ:</Text> Môže len prezerať záznamy, nemôže ich upravovať
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          fullWidth
        >
          Odoslať pozvánku
        </Button>
        <Button
          onPress={() => router.back()}
          variant="outline"
          fullWidth
        >
          Zrušiť
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
  scrollContent: {
    paddingBottom: 150,
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
  form: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  input: {
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  roleList: {
    gap: 12,
  },
  roleOption: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
  },
  roleOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#f0f1ff',
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  roleIcon: {
    fontSize: 24,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  roleLabelSelected: {
    color: '#6366f1',
  },
  roleDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  checkmark: {
    fontSize: 20,
    color: '#6366f1',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 12,
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  infoBold: {
    fontWeight: '600',
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

