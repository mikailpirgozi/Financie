import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Card } from '@/components/ui/Card';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>O aplikácii</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.logoSection}>
            <Text style={styles.logo}>💰</Text>
            <Text style={styles.appName}>FinApp</Text>
            <Text style={styles.tagline}>Inteligentná správa osobných financií</Text>
            <Text style={styles.version}>Verzia 1.0.0</Text>
          </View>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Informácie</Text>
            <InfoRow label="Autor" value="Financie Team" />
            <InfoRow label="Website" value="financie.app" />
            <InfoRow label="Email" value="support@financie.app" />
            <InfoRow label="Build" value="2024.10.30" />
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Technológie</Text>
            <Text style={styles.tech}>React Native • Expo • Supabase</Text>
            <Text style={styles.tech}>TypeScript • PostgreSQL</Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Funkcie</Text>
            <Text style={styles.featureItem}>• Správa úverov s automatickým harmonogramom</Text>
            <Text style={styles.featureItem}>• Sledovanie výdavkov a príjmov</Text>
            <Text style={styles.featureItem}>• Správa majetku a preceňovanie</Text>
            <Text style={styles.featureItem}>• Automatická kategorizácia</Text>
            <Text style={styles.featureItem}>• Mesačné výkazy a štatistiky</Text>
            <Text style={styles.featureItem}>• Push notifikácie</Text>
            <Text style={styles.featureItem}>• Zdieľanie domácnosti</Text>
          </Card>

          <View style={styles.footer}>
            <Text style={styles.copyright}>
              © 2024 Financie App{'\n'}
              Všetky práva vyhradené.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  version: {
    fontSize: 14,
    color: '#9ca3af',
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  tech: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureItem: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
    paddingTop: 32,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  copyright: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});

