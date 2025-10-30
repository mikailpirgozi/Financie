import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface HelpTopic {
  icon: string;
  title: string;
  description: string;
  screen?: string;
}

const helpTopics: HelpTopic[] = [
  {
    icon: '💰',
    title: 'Úvery',
    description: 'Ako vytvoriť a spravovať úvery, sledovať splátky a harmonogram',
    screen: 'loans-help',
  },
  {
    icon: '💸',
    title: 'Výdavky a príjmy',
    description: 'Kategorizácia, pravidlá a mesačné prehľady transakcií',
    screen: 'transactions-help',
  },
  {
    icon: '🏠',
    title: 'Majetok',
    description: 'Sledovanie hodnoty majetku a automatické preceňovanie',
    screen: 'assets-help',
  },
  {
    icon: '👥',
    title: 'Domácnosť',
    description: 'Spolupráca s ostatnými členmi a správa prístupov',
    screen: 'household-help',
  },
  {
    icon: '⚡',
    title: 'Pravidlá',
    description: 'Automatická kategorizácia výdavkov a príjmov',
    screen: 'rules-help',
  },
  {
    icon: '📊',
    title: 'Výkazy a štatistiky',
    description: 'Mesačné súhrny, grafy a analýzy financií',
    screen: 'reports-help',
  },
];

export default function HelpScreen() {
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@financie.app?subject=Podpora FinApp');
  };

  const handleOpenDocs = () => {
    Linking.openURL('https://financie.app/docs');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Pomoc</Text>
          <Text style={styles.subtitle}>Často kladené otázky a návody</Text>
        </View>

        <View style={styles.content}>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Témy pomoci</Text>
            
            {helpTopics.map((topic, index) => (
              <TouchableOpacity
                key={index}
                style={styles.helpItem}
                onPress={() => {
                  // TODO: Navigate to detailed help screen
                }}
              >
                <View style={styles.helpIcon}>
                  <Text style={styles.helpIconText}>{topic.icon}</Text>
                </View>
                <View style={styles.helpContent}>
                  <Text style={styles.helpTitle}>{topic.title}</Text>
                  <Text style={styles.helpDescription}>{topic.description}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Potrebujete pomoc?</Text>
            <Text style={styles.contactText}>
              Náš tím podpory vám rád pomôže s akýmikoľvek otázkami alebo problémami.
            </Text>
            <Button variant="outline" fullWidth onPress={handleContactSupport}>
              📧 Kontaktovať podporu
            </Button>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Dokumentácia</Text>
            <Text style={styles.contactText}>
              Podrobné návody a dokumentáciu nájdete na našom webe.
            </Text>
            <Button variant="outline" fullWidth onPress={handleOpenDocs}>
              📚 Otvoriť dokumentáciu
            </Button>
          </Card>

          <Card style={styles.faqCard}>
            <Text style={styles.faqTitle}>💡 Rýchle tipy</Text>
            <View style={styles.faqList}>
              <Text style={styles.faqItem}>
                • Swipe naľavo na kartách pre rýchle akcie (upraviť, zmazať)
              </Text>
              <Text style={styles.faqItem}>
                • Vytváranie pravidiel urýchli kategorizáciu transakcií
              </Text>
              <Text style={styles.faqItem}>
                • Dashboard sa automaticky aktualizuje pri zmene dát
              </Text>
              <Text style={styles.faqItem}>
                • Môžete byť členom viacerých domácností naraz
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
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
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  helpIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f1ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  helpIconText: {
    fontSize: 24,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  helpDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  chevron: {
    fontSize: 24,
    color: '#d1d5db',
    marginLeft: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  faqCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fbbf24',
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 12,
  },
  faqList: {
    gap: 8,
  },
  faqItem: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 18,
  },
});

