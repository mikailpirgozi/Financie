import Purchases, {
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform, Alert } from 'react-native';
import { env } from './env';

/**
 * Initialize RevenueCat SDK with API keys
 */
export async function initializeSubscriptions(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      if (!env.EXPO_PUBLIC_REVENUECAT_IOS_KEY) {
        console.log('⏭️ RevenueCat skipped (iOS API key not configured)');
        return;
      }
      Purchases.configure({ apiKey: env.EXPO_PUBLIC_REVENUECAT_IOS_KEY });
    } else if (Platform.OS === 'android') {
      if (!env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY) {
        console.log('⏭️ RevenueCat skipped (Android API key not configured)');
        return;
      }
      Purchases.configure({ apiKey: env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY });
    }

    // Enable debug logs in development
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    console.log('✅ RevenueCat initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RevenueCat:', error);
  }
}

/**
 * Get available subscription offerings
 */
export async function getSubscriptionOfferings(): Promise<PurchasesOfferings | null> {
  try {
    const offerings = await Purchases.getOfferings();
    
    if (offerings.current === null) {
      console.warn('No offerings available');
      return null;
    }

    return offerings;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error) {
    if (error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled) {
      console.log('User cancelled purchase');
      return null;
    }

    console.error('Failed to purchase package:', error);
    Alert.alert(
      'Chyba pri nákupe',
      'Nepodarilo sa dokončiť nákup. Skúste to prosím znova.'
    );
    return null;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    
    if (Object.keys(customerInfo.entitlements.active).length > 0) {
      Alert.alert(
        'Úspech',
        'Vaše nákupy boli úspešne obnovené'
      );
    } else {
      Alert.alert(
        'Info',
        'Nenašli sa žiadne predošlé nákupy'
      );
    }

    return customerInfo;
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    Alert.alert(
      'Chyba',
      'Nepodarilo sa obnoviť nákupy. Skúste to prosím znova.'
    );
    return null;
  }
}

/**
 * Get current customer info and subscription status
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    return null;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(entitlementId: string = 'premium'): Promise<boolean> {
  try {
    const customerInfo = await getCustomerInfo();
    
    if (!customerInfo) {
      return false;
    }

    return (
      typeof customerInfo.entitlements.active[entitlementId] !== 'undefined'
    );
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}

/**
 * Get subscription tier name
 */
export function getSubscriptionTier(customerInfo: CustomerInfo | null): string {
  if (!customerInfo) {
    return 'Free';
  }

  const activeEntitlements = customerInfo.entitlements.active;

  if (activeEntitlements.premium) {
    return 'Premium';
  }

  if (activeEntitlements.basic) {
    return 'Basic';
  }

  return 'Free';
}

/**
 * Format subscription price
 */
export function formatPrice(price: number, currencyCode: string): string {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(price);
}

