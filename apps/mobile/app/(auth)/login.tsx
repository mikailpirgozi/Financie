import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Scan } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { env } from '../../src/lib/env';
import { LoadingSpinner } from '../../src/components/LoadingSpinner';
import { AppleSignInButton } from '../../src/components/auth/AppleSignInButton';
import { GoogleSignInButton } from '../../src/components/auth/GoogleSignInButton';
import { useBiometricAuth } from '../../src/hooks';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEnableBiometric, setShowEnableBiometric] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  const router = useRouter();
  const biometricAttempted = useRef(false);

  const {
    isAvailable,
    isEnabled,
    isLoading: biometricLoading,
    getBiometricTypeName,
    biometricLogin,
    enableBiometric,
  } = useBiometricAuth();

  // Complete login after authentication
  const completeLogin = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Initialize user on backend (creates household if needed)
      try {
        const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/auth/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          console.warn('User init error (non-critical):', error);
        }
      } catch (initError) {
        console.warn('Failed to initialize user:', initError);
      }
    }

    router.replace('/(tabs)');
  }, [router]);

  // Handle biometric login
  const handleBiometricLogin = useCallback(async () => {
    if (!isEnabled) return;

    setLoading(true);
    try {
      const credentials = await biometricLogin();
      if (!credentials) {
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
      await completeLogin();
    } catch (error) {
      Alert.alert('Chyba prihlásenia', error instanceof Error ? error.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  }, [isEnabled, biometricLogin, completeLogin]);

  // Auto-trigger biometric on mount if enabled
  useEffect(() => {
    if (!biometricLoading && isEnabled && !biometricAttempted.current) {
      biometricAttempted.current = true;
      handleBiometricLogin();
    }
  }, [biometricLoading, isEnabled, handleBiometricLogin]);

  // Handle enabling biometric after login
  const handleEnableBiometric = async () => {
    if (!pendingCredentials) return;

    const success = await enableBiometric(pendingCredentials.email, pendingCredentials.password);
    if (success) {
      Alert.alert('Úspech', `${getBiometricTypeName()} bolo úspešne aktivované`);
    }
    setShowEnableBiometric(false);
    setPendingCredentials(null);
    await completeLogin();
  };

  // Skip biometric setup
  const handleSkipBiometric = async () => {
    setShowEnableBiometric(false);
    setPendingCredentials(null);
    await completeLogin();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Chyba', 'Prosím vyplňte email a heslo');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // If biometric is available but not enabled, offer to enable it
      if (isAvailable && !isEnabled) {
        setPendingCredentials({ email, password });
        setShowEnableBiometric(true);
        setLoading(false);
        return;
      }

      await completeLogin();
    } catch (error) {
      Alert.alert('Chyba prihlásenia', error instanceof Error ? error.message : 'Neznáma chyba');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Prihlasovanie..." />;
  }

  // Show biometric enable prompt
  if (showEnableBiometric) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.biometricPrompt}>
          <View style={styles.biometricIconContainer}>
            <Scan size={80} color="#8B5CF6" />
          </View>
          <Text style={styles.biometricTitle}>Aktivovať {getBiometricTypeName()}?</Text>
          <Text style={styles.biometricDescription}>
            Prihláste sa rýchlejšie pomocou {getBiometricTypeName()}. Vaše prihlasovacie údaje budú bezpečne uložené v zariadení.
          </Text>
          <TouchableOpacity style={styles.button} onPress={handleEnableBiometric}>
            <Text style={styles.buttonText}>Aktivovať {getBiometricTypeName()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={handleSkipBiometric}>
            <Text style={styles.linkText}>Teraz nie</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>FinApp</Text>
            <Text style={styles.subtitle}>Prihlásenie</Text>

            <View style={styles.form}>
              {/* Face ID / Touch ID tlačidlo ak je povolené */}
              {isAvailable && isEnabled && (
                <>
                  <TouchableOpacity
                    style={styles.biometricButton}
                    onPress={handleBiometricLogin}
                  >
                    <Scan size={24} color="#8B5CF6" />
                    <Text style={styles.biometricButtonText}>
                      Prihlásiť sa cez {getBiometricTypeName()}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>alebo</Text>
                    <View style={styles.dividerLine} />
                  </View>
                </>
              )}

              {/* Email/Heslo prihlásenie */}
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
              />

              <TextInput
                style={styles.input}
                placeholder="Heslo"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Prihlásiť sa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => router.push('/(auth)/register')}
              >
                <Text style={styles.linkText}>Nemáte účet? Zaregistrujte sa</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>alebo</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* OAuth tlačidlá */}
              <View style={styles.oauthButtons}>
                <AppleSignInButton />
                <GoogleSignInButton />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#8B5CF6',
  },
  subtitle: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#0070f3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#0070f3',
    fontSize: 14,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 12,
  },
  oauthButtons: {
    gap: 8,
  },
  // Biometric styles
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E8FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  biometricButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  biometricIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  biometricTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  biometricDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
});

