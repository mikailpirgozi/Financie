import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';
import { env } from './env';

WebBrowser.maybeCompleteAuthSession();

/**
 * Apple Sign In pomocná funkcia
 */
export async function signInWithApple(): Promise<{ error: Error | null }> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
      nonce: credential.user,
    });

    if (error) return { error };

    return { error: null };
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
      return { error: null }; // User cancelled - not an error
    }
    return { error: error instanceof Error ? error : new Error('Apple Sign In failed') };
  }
}

/**
 * Google Sign In pomocná funkcia
 */
export async function signInWithGoogle(): Promise<{ error: Error | null }> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'finapp',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: false,
      },
    });

    if (error) return { error };

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'success') {
        const { url } = result;
        const params = new URLSearchParams(url.split('#')[1] || url.split('?')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          return { error: null };
        }
      }
    }

    return { error: new Error('Google Sign In cancelled or failed') };
  } catch (error) {
    return { error: error instanceof Error ? error : new Error('Google Sign In failed') };
  }
}

/**
 * Initialize user after OAuth login (creates household if needed)
 */
export async function initializeUser(): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('No session found during user initialization');
      return;
    }

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
  } catch (error) {
    console.warn('Failed to initialize user:', error);
  }
}

