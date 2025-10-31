import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import * as Haptics from 'expo-haptics';

export default function PrivacyScreen() {
  const [toast, setToast] = React.useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });

  const handleDownloadData = () => {
    Alert.alert(
      'Stiahnuť údaje',
      'Táto funkcia vytvorí export všetkých vašich údajov. Chcete pokračovať?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Stiahnuť',
          onPress: () => {
            // TODO: Implement data export
            setToast({
              visible: true,
              message: 'Funkcia bude dostupná čoskoro',
              type: 'success',
            });
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Zmazať účet',
      'VAROVANIE: Táto akcia je NEVRATNÁ a zmaže všetky vaše údaje, účet a prístup k všetkým domácnostiam!',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Pokračovať',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Ste si istý?',
              'Naozaj chcete natrvalo zmazať svoj účet? Táto akcia sa NEDÁ vrátiť späť!',
              [
                { text: 'Nie, zrušiť', style: 'cancel' },
                {
                  text: 'Áno, zmazať účet',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // TODO: Implement account deletion via API
                      // This should be done through a secure API endpoint
                      setToast({
                        visible: true,
                        message: 'Pre zmazanie účtu kontaktujte podporu',
                        type: 'error',
                      });
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    } catch (error) {
                      setToast({
                        visible: true,
                        message: 'Chyba pri mazaní účtu',
                        type: 'error',
                      });
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

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Ochrana súkromia</Text>
          <Text style={styles.subtitle}>Ako chránime vaše údaje</Text>
        </View>

        <View style={styles.content}>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Vaše údaje</Text>
            <Text style={styles.text}>
              Všetky vaše finančné údaje sú uložené bezpečne v šifrovanej databáze.
              Máte plnú kontrolu nad svojimi dátami a môžete ich kedykoľvek exportovať
              alebo vymazať.
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Čo zbierame</Text>
            <Text style={styles.listItem}>
              • Email adresa a meno{'\n'}
              • Finančné transakcie a údaje{'\n'}
              • Preferencie a nastavenia{'\n'}
              • Analytické údaje o používaní aplikácie
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Ako chránime vaše údaje</Text>
            <Text style={styles.listItem}>
              • End-to-end šifrovanie citlivých údajov{'\n'}
              • Pravidelné bezpečnostné audity{'\n'}
              • GDPR compliance{'\n'}
              • Žiadne zdieľanie s tretími stranami bez vášho súhlasu{'\n'}
              • Dátové centrum v EÚ
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Vaše práva</Text>
            <Text style={styles.text}>
              Podľa GDPR máte právo na prístup, opravu a vymazanie svojich údajov kedykoľvek.
            </Text>
            <View style={styles.actions}>
              <Button 
                variant="outline" 
                fullWidth 
                onPress={handleDownloadData}
                style={styles.actionButton}
              >
                📥 Stiahnuť moje údaje
              </Button>
            </View>
          </Card>

          <Card style={styles.dangerSection}>
            <Text style={styles.dangerTitle}>⚠️ Nebezpečná zóna</Text>
            <Text style={styles.dangerText}>
              Zmazanie účtu natrvalo odstráni všetky vaše údaje vrátane výdavkov, príjmov,
              úverov, majetku a členstva vo všetkých domácnostiach. Táto akcia je NEVRATNÁ!
            </Text>
            <Button 
              variant="destructive" 
              fullWidth 
              onPress={handleDeleteAccount}
            >
              Vymazať účet
            </Button>
          </Card>

          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>ℹ️ Ďalšie informácie</Text>
            <Text style={styles.infoText}>
              Kompletné pravidlá ochrany súkromia a podmienky používania nájdete na našom webe.
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
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  listItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  actions: {
    marginTop: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
  dangerSection: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    marginTop: 8,
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 12,
  },
  dangerText: {
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 18,
    marginBottom: 16,
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

