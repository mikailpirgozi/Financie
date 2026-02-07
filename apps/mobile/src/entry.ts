/**
 * Custom entry point that adds polyfills before expo-router loads.
 *
 * CRITICAL: We use require() instead of import because Babel hoists
 * ES import declarations above all other statements. Using require()
 * guarantees the polyfill executes BEFORE expo-router loads the app.
 */

// Polyfill navigator.userAgent for Hermes/standalone build compatibility
if (typeof globalThis.navigator === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).navigator = { userAgent: '' };
} else if (typeof (globalThis.navigator as unknown as Record<string, unknown>).userAgent === 'undefined') {
  (globalThis.navigator as unknown as Record<string, unknown>).userAgent = '';
}

// Catch fatal startup errors and show them visually in production
try {
  require('expo-router/entry');
} catch (error: unknown) {
  const { AppRegistry, Text, View } = require('react-native');
  const msg = error instanceof Error ? error.message + '\n' + error.stack : String(error);

  const ErrorApp = () =>
    // eslint-disable-next-line react/react-in-jsx-scope
    require('react').createElement(
      View,
      { style: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' } },
      require('react').createElement(
        Text,
        { style: { color: '#EF4444', fontWeight: '700', fontSize: 18, marginBottom: 12 } },
        'Startup crash',
      ),
      require('react').createElement(
        Text,
        { style: { color: '#666', fontSize: 12, fontFamily: 'monospace' } },
        msg,
      ),
    );

  AppRegistry.registerComponent('main', () => ErrorApp);
}
