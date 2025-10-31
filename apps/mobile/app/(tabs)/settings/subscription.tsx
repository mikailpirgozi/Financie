import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

import { getSubscriptionStatus, SubscriptionStatus, getCurrentHousehold } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Plan {
  id: 'free' | 'pro' | 'premium';
  name: string;
  price: number;
  description: string;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Pre začínajúcich',
    features: [
      '1 domácnosť',
      'Max 3 členovia',
      'Základné funkcie',
      'Mesačné výkazy',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    description: 'Pre rodiny',
    features: [
      '3 domácnosti',
      'Neobmedzený počet členov',
      'Všetky funkcie',
      'Prioritná podpora',
      'Export do PDF',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    description: 'Pre profesionálov',
    features: [
      'Neobmedzené domácnosti',
      'Neobmedzení členovia',
      'Všetky funkcie',
      'VIP podpora',
      'API prístup',
      'Vlastný branding',
    ],
  },
];

export default function SubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const household = await getCurrentHousehold();
      const status = await getSubscriptionStatus(household.id);

      setCurrentPlan(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nepodarilo sa načítať predplatné';
      setError(message);
      console.error('Failed to load subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = (_planId: string) => {
    Alert.alert(
      'Upgrade predplatného',
      'Pre upgrade plána navštívte webovú aplikáciu alebo kontaktujte podporu.',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Otvoriť web',
          onPress: () => {
            // In production, this would open the web app's subscription page
            console.log('Opening web app subscription page');
          },
        },
      ]
    );
  };

  const isCurrent = (planId: string) => {
    return currentPlan?.plan === planId;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Predplatné</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Načítavam...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Predplatné</Text>
        {currentPlan && (
          <Text style={styles.subtitle}>
            Aktuálny plán:{' '}
            <Text style={styles.currentPlanText}>{currentPlan.plan.toUpperCase()}</Text>
          </Text>
        )}
      </View>

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Button onPress={loadSubscription} variant="outline" size="sm" fullWidth>
            Skúsiť znova
          </Button>
        </Card>
      )}

      <View style={styles.content}>
        {PLANS.map((plan) => {
          const isCurrentPlan = isCurrent(plan.id);

          return (
            <Card
              key={plan.id}
              style={[styles.planCard, ...(isCurrentPlan ? [styles.currentPlanCard] : [])]}
            >
              {isCurrentPlan && (
                <View style={styles.currentBadge}>
                  <Text style={styles.badgeText}>✓ Aktuálny plán</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planDescription}>{plan.description}</Text>

              <View style={styles.priceRow}>
                <Text style={styles.price}>
                  {plan.price === 0 ? 'Zadarmo' : `€${plan.price.toFixed(2)}`}
                </Text>
                {plan.price > 0 && <Text style={styles.period}>/mesiac</Text>}
              </View>

              <View style={styles.features}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Text style={styles.featureIcon}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {!isCurrentPlan && (
                <Button
                  onPress={() => handleUpgrade(plan.id)}
                  fullWidth
                  style={styles.upgradeButton}
                >
                  {plan.price === 0 ? 'Prejsť na Free' : 'Upgrade'}
                </Button>
              )}
            </Card>
          );
        })}
      </View>

      <View style={styles.info}>
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Informácie</Text>
          <Text style={styles.infoText}>
            • Všetky plány obsahujú <Text style={styles.bold}>14-dňovú bezplatnú skúšobnú dobu</Text>
          </Text>
          <Text style={styles.infoText}>
            • Môžete kedykoľvek <Text style={styles.bold}>zmeniť alebo zrušiť</Text> predplatné
          </Text>
          <Text style={styles.infoText}>
            • Bez skrytých poplatkov, bez dlhodobej zmluvy
          </Text>
        </Card>

        <Card style={styles.supportCard}>
          <Text style={styles.supportTitle}>💬 Potrebujete pomoc?</Text>
          <Button variant="outline" fullWidth onPress={() => {}}>
            Kontaktovať podporu
          </Button>
        </Card>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Porovnať všetky plány detailne →
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  currentPlanText: {
    fontWeight: 'bold',
    color: '#0ea5e9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#fee',
    borderColor: '#f55',
    borderWidth: 1,
  },
  errorText: {
    color: '#c00',
    fontSize: 14,
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  planCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  currentPlanCard: {
    borderColor: '#0ea5e9',
    borderWidth: 2,
    backgroundColor: '#f0f9ff',
  },
  currentBadge: {
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  period: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  features: {
    marginBottom: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureIcon: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: 'bold',
    marginRight: 8,
    width: 16,
  },
  featureText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  upgradeButton: {
    marginTop: 8,
  },
  info: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  infoCard: {
    backgroundColor: '#f9fafb',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    lineHeight: 18,
  },
  bold: {
    fontWeight: '600',
    color: '#000',
  },
  supportCard: {
    backgroundColor: '#f9fafb',
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#0ea5e9',
    fontWeight: '600',
  },
});
