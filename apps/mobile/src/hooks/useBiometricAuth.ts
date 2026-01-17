import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform, Alert } from 'react-native';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const CREDENTIALS_EMAIL_KEY = 'credentials_email';
const CREDENTIALS_PASSWORD_KEY = 'credentials_password';

export interface BiometricAuthState {
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: 'face' | 'fingerprint' | 'none';
  isLoading: boolean;
}

export interface StoredCredentials {
  email: string;
  password: string;
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isEnabled: false,
    biometricType: 'none',
    isLoading: true,
  });

  // Check biometric availability and current settings
  const checkBiometricStatus = useCallback(async () => {
    try {
      // Check if hardware is available
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        setState({
          isAvailable: false,
          isEnabled: false,
          biometricType: 'none',
          isLoading: false,
        });
        return;
      }

      // Check if biometrics are enrolled
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        setState({
          isAvailable: false,
          isEnabled: false,
          biometricType: 'none',
          isLoading: false,
        });
        return;
      }

      // Get available biometric types
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      let biometricType: 'face' | 'fingerprint' | 'none' = 'none';
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'face';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      }

      // Check if user has enabled biometric login
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);

      setState({
        isAvailable: true,
        isEnabled: enabled === 'true',
        biometricType,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to check biometric status:', error);
      setState({
        isAvailable: false,
        isEnabled: false,
        biometricType: 'none',
        isLoading: false,
      });
    }
  }, []);

  useEffect(() => {
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  // Authenticate with biometrics
  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Prihláste sa pomocou biometrie',
        cancelLabel: 'Zrušiť',
        disableDeviceFallback: false,
        fallbackLabel: 'Použiť heslo',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }, []);

  // Save credentials securely
  const saveCredentials = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      await SecureStore.setItemAsync(CREDENTIALS_EMAIL_KEY, email, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      await SecureStore.setItemAsync(CREDENTIALS_PASSWORD_KEY, password, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      return true;
    } catch (error) {
      console.error('Failed to save credentials:', error);
      return false;
    }
  }, []);

  // Get stored credentials
  const getCredentials = useCallback(async (): Promise<StoredCredentials | null> => {
    try {
      const email = await SecureStore.getItemAsync(CREDENTIALS_EMAIL_KEY);
      const password = await SecureStore.getItemAsync(CREDENTIALS_PASSWORD_KEY);

      if (email && password) {
        return { email, password };
      }
      return null;
    } catch (error) {
      console.error('Failed to get credentials:', error);
      return null;
    }
  }, []);

  // Enable biometric login
  const enableBiometric = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      // First authenticate to confirm user identity
      const authenticated = await authenticate();
      if (!authenticated) {
        return false;
      }

      // Save credentials
      const saved = await saveCredentials(email, password);
      if (!saved) {
        Alert.alert('Chyba', 'Nepodarilo sa uložiť prihlasovacie údaje');
        return false;
      }

      // Mark biometric as enabled
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      
      setState(prev => ({ ...prev, isEnabled: true }));
      return true;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  }, [authenticate, saveCredentials]);

  // Disable biometric login
  const disableBiometric = useCallback(async (): Promise<boolean> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      await SecureStore.deleteItemAsync(CREDENTIALS_EMAIL_KEY);
      await SecureStore.deleteItemAsync(CREDENTIALS_PASSWORD_KEY);
      
      setState(prev => ({ ...prev, isEnabled: false }));
      return true;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  }, []);

  // Perform biometric login
  const biometricLogin = useCallback(async (): Promise<StoredCredentials | null> => {
    if (!state.isEnabled) {
      return null;
    }

    const authenticated = await authenticate();
    if (!authenticated) {
      return null;
    }

    return getCredentials();
  }, [state.isEnabled, authenticate, getCredentials]);

  // Get biometric type display name
  const getBiometricTypeName = useCallback((): string => {
    if (state.biometricType === 'face') {
      return Platform.OS === 'ios' ? 'Face ID' : 'Rozpoznávanie tváre';
    }
    if (state.biometricType === 'fingerprint') {
      return Platform.OS === 'ios' ? 'Touch ID' : 'Odtlačok prsta';
    }
    return 'Biometria';
  }, [state.biometricType]);

  return {
    ...state,
    authenticate,
    enableBiometric,
    disableBiometric,
    biometricLogin,
    getCredentials,
    getBiometricTypeName,
    refreshStatus: checkBiometricStatus,
  };
}
