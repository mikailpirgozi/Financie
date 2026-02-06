/**
 * Custom entry point that adds polyfills before expo-router loads.
 *
 * Zod v4 accesses navigator.userAgent during module initialization.
 * This is undefined in React Native's Hermes engine (standalone builds),
 * causing a crash before React can mount. Expo Go adds its own polyfills
 * which is why it works there but not in production builds.
 */

// Polyfill navigator.userAgent for Hermes compatibility
if (typeof globalThis.navigator === 'undefined') {
  (globalThis as Record<string, unknown>).navigator = { userAgent: '' };
} else if (typeof (globalThis.navigator as Record<string, unknown>).userAgent === 'undefined') {
  (globalThis.navigator as Record<string, unknown>).userAgent = '';
}

// Now load expo-router entry
import 'expo-router/entry';
