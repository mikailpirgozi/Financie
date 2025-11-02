import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getCurrentHousehold } from '../../../src/lib/api';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '../../../src/components/LoadingSpinner';
import { ErrorMessage } from '../../../src/components/ErrorMessage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

interface Household {
  id: string;
  name: string;
  created_at: string;
}

export default function HouseholdSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  useEffect(() => {
    loadHousehold();
  }, []);

  const loadHousehold = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getCurrentHousehold();
      setHousehold(data);
      setNewName(data.name);
      
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      const { data: membership } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', data.id)
        .eq('user_id', user?.id)
        .single();
      
      setIsAdmin(membership?.role === 'admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nepodarilo sa načítať domácnosť');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ visible: true, message, type });
  };

  const handleUpdateName = async () => {
    if (!household || !isAdmin) return;
    
    if (!newName.trim()) {
      showToast('Zadajte názov domácnosti', 'error');
      return;
    }

    try {
      setUpdating(true);
      const { error: updateError } = await supabase
        .from('households')
        .update({ name: newName.trim() })
        .eq('id', household.id);

      if (updateError) throw updateError;

      showToast('Názov domácnosti bol aktualizovaný', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEditingName(false);
      await loadHousehold();
    } catch (error) {
      showToast('Nepodarilo sa aktualizovať názov', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUpdating(false);
    }
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
      'Opustiť domácnosť',
      'Naozaj chcete opustiť túto domácnosť? Stratíte prístup k všetkým dátam.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Opustiť',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              const { data: { user } } = await supabase.auth.getUser();
              const { error: deleteError } = await supabase
                .from('household_members')
                .delete()
                .eq('household_id', household?.id)
                .eq('user_id', user?.id);

              if (deleteError) throw deleteError;

              showToast('Opustili ste domácnosť', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              // Navigate back to main screen
              setTimeout(() => {
                router.replace('/(tabs)');
              }, 1000);
            } catch (error) {
              showToast('Nepodarilo sa opustiť domácnosť', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteHousehold = () => {
    if (!isAdmin) return;

    Alert.alert(
      'Zmazať domácnosť',
      'Naozaj chcete zmazať túto domácnosť? Táto akcia je NEVRATNÁ a zmaže všetky dáta!',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Zmazať',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Definitívne zmazať?',
              'Toto skutočne zmaže všetky výdavky, príjmy, úvery, majetok a kategórie. Táto akcia sa NEDÁ vrátiť späť!',
              [
                { text: 'Zrušiť', style: 'cancel' },
                {
                  text: 'Áno, zmazať všetko',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setUpdating(true);
                      const { error: deleteError } = await supabase
                        .from('households')
                        .delete()
                        .eq('id', household?.id);

                      if (deleteError) throw deleteError;

                      showToast('Domácnosť bola zmazaná', 'success');
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      
                      setTimeout(() => {
                        router.replace('/(tabs)');
                      }, 1000);
                    } catch (error) {
                      showToast('Nepodarilo sa zmazať domácnosť', 'error');
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                      setUpdating(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingSpinner message="Načítavam nastavenia..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage message={error} onRetry={loadHousehold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Nastavenia domácnosti</Text>
          <Text style={styles.subtitle}>
            {isAdmin ? 'Môžete upravovať nastavenia' : 'Iba na čítanie'}
          </Text>
        </View>

        <View style={styles.content}>
          {/* Basic Info */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Základné informácie</Text>
            
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Názov domácnosti</Text>
              {editingName ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.input}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Názov domácnosti"
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={[styles.editButton, styles.saveButton]}
                      onPress={handleUpdateName}
                      disabled={updating}
                    >
                      <Text style={styles.saveButtonText}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editButton, styles.cancelButton]}
                      onPress={() => {
                        setEditingName(false);
                        setNewName(household?.name || '');
                      }}
                      disabled={updating}
                    >
                      <Text style={styles.cancelButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.valueContainer}>
                  <Text style={styles.fieldValue}>{household?.name}</Text>
                  {isAdmin && (
                    <TouchableOpacity
                      onPress={() => setEditingName(true)}
                      style={styles.editLink}
                    >
                      <Text style={styles.editLinkText}>Upraviť</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Vytvorené</Text>
              <Text style={styles.fieldValue}>
                {household?.created_at && new Date(household.created_at).toLocaleDateString('sk-SK', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ID domácnosti</Text>
              <Text style={styles.fieldValueMono}>{household?.id}</Text>
            </View>
          </Card>

          {/* Danger Zone */}
          <Card style={styles.dangerSection}>
            <Text style={styles.dangerTitle}>⚠️ Nebezpečná zóna</Text>
            
            <Button
              onPress={handleLeaveHousehold}
              variant="outline"
              disabled={updating}
              fullWidth
              style={styles.dangerButton}
            >
              Opustiť domácnosť
            </Button>

            {isAdmin && (
              <>
                <View style={styles.divider} />
                <Button
                  onPress={handleDeleteHousehold}
                  variant="destructive"
                  disabled={updating}
                  fullWidth
                >
                  Zmazať domácnosť
                </Button>
                <Text style={styles.dangerHint}>
                  Toto zmaže všetky dáta vrátane výdavkov, príjmov, úverov a majetku. Táto akcia je NEVRATNÁ!
                </Text>
              </>
            )}
          </Card>
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
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#111827',
  },
  fieldValueMono: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editLink: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  editLinkText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  editContainer: {
    gap: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#111827',
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  dangerSection: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    marginTop: 24,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 16,
  },
  dangerButton: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#fecaca',
    marginVertical: 16,
  },
  dangerHint: {
    fontSize: 12,
    color: '#991b1b',
    marginTop: 8,
    textAlign: 'center',
  },
});

