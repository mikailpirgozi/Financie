import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Check, ArrowLeft, RefreshCcw } from 'lucide-react-native';
import type { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import {
  getSubscriptionOfferings,
  purchasePackage,
  restorePurchases,
  getCustomerInfo,
  getSubscriptionTier,
  formatPrice,
} from '../../../src/lib/subscriptions';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentTier, setCurrentTier] = useState<string>('Free');

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      // Get customer info
      const info = await getCustomerInfo();
      setCustomerInfo(info);
      setCurrentTier(getSubscriptionTier(info));

      // Get available offerings
      const offerings = await getSubscriptionOfferings();
      if (offerings?.current) {
        setPackages(offerings.current.availablePackages);
      }
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      Alert.alert('Chyba', 'Nepodarilo sa načítať údaje o predplatnom');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setIsPurchasing(true);
    try {
      const info = await purchasePackage(pkg);
      if (info) {
        setCustomerInfo(info);
        setCurrentTier(getSubscriptionTier(info));
        Alert.alert(
          'Úspech! 🎉',
          'Vaše predplatné bolo úspešne aktivované. Ďakujeme za podporu!'
        );
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    try {
      const info = await restorePurchases();
      if (info) {
        setCustomerInfo(info);
        setCurrentTier(getSubscriptionTier(info));
      }
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setIsPurchasing(false);
    }
  };

  const getPackageTitle = (pkg: PurchasesPackage): string => {
    const product = pkg.product;
    return product.title || pkg.identifier;
  };

  const getPackageDescription = (pkg: PurchasesPackage): string => {
    const product = pkg.product;
    return product.description || '';
  };

  const getPackageDuration = (pkg: PurchasesPackage): string => {
    if (pkg.packageType === 'MONTHLY') {
      return 'mesiac';
    } else if (pkg.packageType === 'ANNUAL') {
      return 'rok';
    } else if (pkg.packageType === 'WEEKLY') {
      return 'týždeň';
    } else {
      return '';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Predplatné</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.title}>Predplatné</Text>
        <TouchableOpacity onPress={handleRestore} disabled={isPurchasing}>
          <RefreshCcw size={24} color={isPurchasing ? '#d1d5db' : '#6b7280'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Current Plan Card */}
        <View style={styles.currentPlanCard}>
          <View style={styles.currentPlanHeader}>
            <Crown size={32} color="#f59e0b" />
            <View style={styles.currentPlanInfo}>
              <Text style={styles.currentPlanLabel}>Súčasný plán</Text>
              <Text style={styles.currentPlanTier}>{currentTier}</Text>
            </View>
          </View>

          {currentTier === 'Free' && (
            <Text style={styles.currentPlanDescription}>
              Upgradujte na Premium pre neomezený prístup k všetkým funkciám
            </Text>
          )}

          {currentTier !== 'Free' && customerInfo && (
            <View style={styles.subscriptionDetails}>
              <Text style={styles.subscriptionDetailsText}>
                Status: Aktívne ✓
              </Text>
              {customerInfo.managementURL && (
                <TouchableOpacity>
                  <Text style={styles.manageLink}>Spravovať predplatné</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Premium Features */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Premium výhody</Text>

          <View style={styles.feature}>
            <Check size={20} color="#10b981" />
            <Text style={styles.featureText}>Neobmedzený počet úverov</Text>
          </View>

          <View style={styles.feature}>
            <Check size={20} color="#10b981" />
            <Text style={styles.featureText}>Pokročilé grafy a analýzy</Text>
          </View>

          <View style={styles.feature}>
            <Check size={20} color="#10b981" />
            <Text style={styles.featureText}>Export do PDF a Excel</Text>
          </View>

          <View style={styles.feature}>
            <Check size={20} color="#10b981" />
            <Text style={styles.featureText}>Automatické pravidlá kategorizácie</Text>
          </View>

          <View style={styles.feature}>
            <Check size={20} color="#10b981" />
            <Text style={styles.featureText}>Push notifikácie na splátky</Text>
          </View>

          <View style={styles.feature}>
            <Check size={20} color="#10b981" />
            <Text style={styles.featureText}>Prioritná podpora</Text>
          </View>
        </View>

        {/* Pricing Cards */}
        {packages.length > 0 && currentTier === 'Free' && (
          <View style={styles.pricingSection}>
            <Text style={styles.pricingSectionTitle}>Vyberte si plán</Text>

            {packages.map((pkg) => {
              const isPopular = pkg.packageType === 'ANNUAL';

              return (
                <View
                  key={pkg.identifier}
                  style={[styles.pricingCard, isPopular && styles.pricingCardPopular]}
                >
                  {isPopular && (
                    <View style={styles.popularBadge}>
                      <Text style={styles.popularBadgeText}>Najpopulárnejšie</Text>
                    </View>
                  )}

                  <View style={styles.pricingHeader}>
                    <Text style={styles.pricingTitle}>
                      {getPackageTitle(pkg)}
                    </Text>
                    <Text style={styles.pricingDescription}>
                      {getPackageDescription(pkg)}
                    </Text>
                  </View>

                  <View style={styles.pricingPriceContainer}>
                    <Text style={styles.pricingPrice}>
                      {formatPrice(
                        pkg.product.price,
                        pkg.product.currencyCode
                      )}
                    </Text>
                    <Text style={styles.pricingDuration}>
                      / {getPackageDuration(pkg)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.purchaseButton,
                      isPopular && styles.purchaseButtonPopular,
                      isPurchasing && styles.purchaseButtonDisabled,
                    ]}
                    onPress={() => handlePurchase(pkg)}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text
                        style={[
                          styles.purchaseButtonText,
                          isPopular && styles.purchaseButtonTextPopular,
                        ]}
                      >
                        Vybrať plán
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Predplatné sa automaticky obnoví, ak ho nezrušíte najneskôr 24 hodín
            pred koncom aktuálneho obdobia.
          </Text>
          <Text style={styles.footerText}>
            Zrušenie predplatného nadobudne účinnosť po skončení aktuálneho
            obdobia.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  currentPlanCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPlanInfo: {
    marginLeft: 16,
  },
  currentPlanLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  currentPlanTier: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  currentPlanDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  subscriptionDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  subscriptionDetailsText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 8,
  },
  manageLink: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  featuresCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 12,
  },
  pricingSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  pricingSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  pricingCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pricingCardPopular: {
    borderColor: '#8b5cf6',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  pricingHeader: {
    marginBottom: 16,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pricingDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  pricingPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  pricingPrice: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
  },
  pricingDuration: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 4,
  },
  purchaseButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  purchaseButtonPopular: {
    backgroundColor: '#8b5cf6',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  purchaseButtonTextPopular: {
    color: '#fff',
  },
  footer: {
    padding: 16,
    marginBottom: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
});
