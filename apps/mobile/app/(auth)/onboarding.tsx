import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Onboarding from 'react-native-onboarding-swiper';
import { Wallet, TrendingUp, Bell, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = '@onboarding_completed';

export default function OnboardingScreen() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = React.useState(false);

  // Check if onboarding was already completed - prevent loops
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
        if (value === 'true' && !isNavigating) {
          // Already completed, navigate away
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      }
    };
    checkStatus();
  }, []);

  const handleDone = async () => {
    if (isNavigating) return; // Prevent multiple calls
    setIsNavigating(true);
    
    try {
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      console.log('Onboarding completed, saved to AsyncStorage');
      // Small delay to ensure AsyncStorage write completes
      setTimeout(() => {
        router.replace('/(auth)/login');
      }, 100);
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = async () => {
    await handleDone();
  };

  return (
    <Onboarding
      onDone={handleDone}
      onSkip={handleSkip}
      pages={[
        {
          backgroundColor: '#8b5cf6',
          image: (
            <View style={styles.iconContainer}>
              <Wallet size={120} color="#ffffff" />
            </View>
          ),
          title: 'Vitajte v FinApp',
          subtitle: 'Vaša osobná finančná aplikácia pre sledovanie úverov, výdavkov a príjmov na jednom mieste',
        },
        {
          backgroundColor: '#10b981',
          image: (
            <View style={styles.iconContainer}>
              <TrendingUp size={120} color="#ffffff" />
            </View>
          ),
          title: 'Prehľad Financií',
          subtitle: 'Interaktívne grafy a detailné reporty vám pomôžu robiť lepšie finančné rozhodnutia',
        },
        {
          backgroundColor: '#f59e0b',
          image: (
            <View style={styles.iconContainer}>
              <Bell size={120} color="#ffffff" />
            </View>
          ),
          title: 'Smart Notifikácie',
          subtitle: 'Nikdy nezmeškajte dôležitú splátku. Dostávajte pripomienky 3 dni vopred a pri splatnosti',
        },
        {
          backgroundColor: '#0070f3',
          image: (
            <View style={styles.iconContainer}>
              <CheckCircle size={120} color="#ffffff" />
            </View>
          ),
          title: 'Začnite Teraz',
          subtitle: 'Vytvorte si účet alebo sa prihláste a začnite kontrolovať svoje financie ešte dnes',
        },
      ]}
      showSkip={true}
      skipLabel="Preskočiť"
      nextLabel="Ďalej"
      doneLabel="Začať"
      titleStyles={styles.title}
      subTitleStyles={styles.subtitle}
      bottomBarHighlight={false}
    />
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
});

