import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Crown } from 'lucide-react-native';
import {
  getSubscriptionOfferings,
  purchasePackage,
  restorePurchases,
  hasActiveSubscription,
  formatPrice,
} from '../../src/lib/subscriptions';
import type { PurchasesPackage, PurchasesOfferings } from 'react-native-purchases';

const FEATURES = [
  'Neobmedzene zariadeni v domacnosti',
  'Pokrocile statistiky a forecast 12 mesiacov',
  'OCR blockov a automaticka kategorizacia',
  'Bank import (Tatra, VUB, CSOB)',
  'AI insights nad vlastnymi datami',
  'Prioritna podpora',
];

export default function PaywallScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const isPro = await hasActiveSubscription('pro');
      if (isPro && mounted) {
        Alert.alert('Uz mate Pro', 'Vase predplatne je aktivne.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
        return;
      }
      const o = await getSubscriptionOfferings();
      if (mounted) {
        setOfferings(o);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handlePurchase(pkg: PurchasesPackage) {
    setBusy(true);
    try {
      const info = await purchasePackage(pkg);
      if (info?.entitlements.active.pro) {
        Alert.alert('Vitajte v FinApp Pro!', 'Vsetky funkcie su odomknute.', [
          { text: 'Super', onPress: () => router.back() },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    setBusy(true);
    try {
      await restorePurchases();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'FinApp Pro' }} />

      <View style={styles.heroIcon}>
        <Crown size={64} color="#F59E0B" />
      </View>
      <Text style={styles.title}>FinApp Pro</Text>
      <Text style={styles.subtitle}>Vyuzite plny potencial vasich financii</Text>

      <View style={styles.featuresCard}>
        {FEATURES.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.featureBullet}>•</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={styles.spinner} />
      ) : !offerings || !offerings.current ? (
        <Text style={styles.empty}>
          Predplatne nie je dostupne. Skontrolujte ze RevenueCat je nakonfigurovany a App
          Store/Google Play produkty su pripravene.
        </Text>
      ) : (
        <View style={styles.packages}>
          {offerings.current.availablePackages.map((pkg) => (
            <Pressable
              key={pkg.identifier}
              style={({ pressed }) => [
                styles.packageCard,
                pressed && { opacity: 0.85 },
                busy && { opacity: 0.5 },
              ]}
              disabled={busy}
              onPress={() => handlePurchase(pkg)}
            >
              <Text style={styles.packageTitle}>{pkg.product.title}</Text>
              <Text style={styles.packagePrice}>
                {formatPrice(pkg.product.price, pkg.product.currencyCode)}
              </Text>
              <Text style={styles.packageDesc}>{pkg.product.description}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={styles.restoreBtn} onPress={handleRestore} disabled={busy}>
        <Text style={styles.restoreText}>Obnovit predosle nakupy</Text>
      </Pressable>

      <Text style={styles.legal}>
        Predplatne sa automaticky obnovuje. Mozete ho zrusit kedykolvek v nastaveniach App Store /
        Google Play.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 16 },
  heroIcon: { alignItems: 'center', marginTop: 16 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 12 },
  featuresCard: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  featureRow: { flexDirection: 'row', gap: 8 },
  featureBullet: { color: '#F59E0B', fontWeight: '700' },
  featureText: { flex: 1, fontSize: 14, color: '#1f2937' },
  spinner: { marginVertical: 24 },
  empty: { color: '#666', textAlign: 'center', paddingHorizontal: 16 },
  packages: { gap: 12, marginTop: 8 },
  packageCard: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
  },
  packageTitle: { fontSize: 18, fontWeight: '600' },
  packagePrice: { fontSize: 24, fontWeight: '700', color: '#F59E0B', marginVertical: 4 },
  packageDesc: { fontSize: 13, color: '#666' },
  restoreBtn: { padding: 12, alignItems: 'center' },
  restoreText: { color: '#0070f3' },
  legal: { fontSize: 11, color: '#999', textAlign: 'center', lineHeight: 16 },
});
