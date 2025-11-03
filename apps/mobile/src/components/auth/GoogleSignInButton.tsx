import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithGoogle, initializeUser } from '../../lib/oauth';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
}

export function GoogleSignInButton({ onSuccess }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();

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
        error instanceof Error ? error.message : 'Nepodarilo sa prihlásiť cez Google'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={handleGoogleSignIn}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#4285F4" size="small" />
      ) : (
        <>
          <Text style={styles.icon}>G</Text>
          <Text style={styles.text}>Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    width: '100%',
    height: 40,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  icon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285F4',
    marginRight: 8,
  },
  text: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
});

