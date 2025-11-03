import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { signInWithApple, initializeUser } from '../../lib/oauth';

interface AppleSignInButtonProps {
  onSuccess?: () => void;
}

export function AppleSignInButton({ onSuccess }: AppleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Apple Sign In je dostupný len na iOS 13+
  if (Platform.OS !== 'ios') {
    return null;
  }

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithApple();

      if (error) {
        Alert.alert('Chyba prihlásenia', error.message);
        return;
      }

      // Initialize user (create household if needed)
      await initializeUser();

      if (onSuccess) {
        onSuccess();
      } else {
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert(
        'Chyba',
        error instanceof Error ? error.message : 'Nepodarilo sa prihlásiť cez Apple'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, loading && styles.containerDisabled]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
        cornerRadius={6}
        style={styles.button}
        onPress={loading ? () => {} : handleAppleSignIn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  containerDisabled: {
    opacity: 0.6,
  },
  button: {
    width: '100%',
    height: 40,
  },
});

