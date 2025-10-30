import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Card } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';

interface NotificationSettings {
  loanReminders: boolean;
  monthlyReports: boolean;
  householdUpdates: boolean;
  marketingEmails: boolean;
}

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>({
    loanReminders: true,
    monthlyReports: true,
    householdUpdates: true,
    marketingEmails: false,
  });
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    
    // TODO: Save to backend when API is ready
    setToast({ visible: true, message: 'Nastavenia boli aktualizované', type: 'success' });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifikácie</Text>
          <Text style={styles.subtitle}>Spravujte upozornenia a oznámenia</Text>
        </View>

        <View style={styles.content}>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Push notifikácie</Text>
            
            <SwitchRow
              label="Upozornenia na splátky"
              description="Pripomienky 3 dni pred splatnosťou úverov"
              value={settings.loanReminders}
              onValueChange={() => handleToggle('loanReminders')}
            />
            
            <SwitchRow
              label="Mesačné reporty"
              description="Súhrn financií na konci každého mesiaca"
              value={settings.monthlyReports}
              onValueChange={() => handleToggle('monthlyReports')}
            />
            
            <SwitchRow
              label="Aktualizácie domácnosti"
              description="Zmeny a úpravy od ostatných členov"
              value={settings.householdUpdates}
              onValueChange={() => handleToggle('householdUpdates')}
            />
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Email notifikácie</Text>
            
            <SwitchRow
              label="Marketingové emaily"
              description="Novinky, tipy a špeciálne ponuky"
              value={settings.marketingEmails}
              onValueChange={() => handleToggle('marketingEmails')}
            />
          </Card>

          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ Dôležité upozornenia</Text>
            <Text style={styles.infoText}>
              Niektoré kritické notifikácie (napr. bezpečnostné upozornenia) nemožno vypnúť.
            </Text>
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

function SwitchRow({ label, description, value, onValueChange }: {
  label: string;
  description: string;
  value: boolean;
  onValueChange: () => void;
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchLabel}>
        <Text style={styles.switchTitle}>{label}</Text>
        <Text style={styles.switchDescription}>{description}</Text>
      </View>
      <Switch 
        value={value} 
        onValueChange={onValueChange}
        trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
        thumbColor={value ? '#6366f1' : '#f3f4f6'}
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
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  switchLabel: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    marginTop: 8,
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
});

