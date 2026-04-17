const { withSentryConfig } = require('@sentry/nextjs');

/**
 * Build Content-Security-Policy. Allows:
 *   - self + Supabase (REST, realtime, storage)
 *   - Stripe.js + checkout iframes
 *   - Sentry browser SDK + ingestion endpoints
 *   - inline styles (Tailwind/Radix), inline script for Next.js bootstrap
 *
 * `unsafe-eval` is required by some Next.js dev features and Recharts; we
 * keep it everywhere because removing it breaks dashboards in production
 * builds too. If you ever switch to a strict-CSP-friendly chart library,
 * tighten this.
 */
function buildCsp() {
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
    : '*.supabase.co';
  const sentryHost = process.env.NEXT_PUBLIC_SENTRY_DSN
    ? new URL(process.env.NEXT_PUBLIC_SENTRY_DSN).host
    : '*.ingest.sentry.io';

  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      'https://js.stripe.com',
      `https://${sentryHost}`,
    ],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'blob:', `https://${supabaseHost}`, 'https://*.stripe.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    'connect-src': [
      "'self'",
      `https://${supabaseHost}`,
      `wss://${supabaseHost}`,
      'https://api.stripe.com',
      `https://${sentryHost}`,
      'https://o*.ingest.sentry.io',
    ],
    'frame-src': ["'self'", 'https://js.stripe.com', 'https://hooks.stripe.com'],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  return Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(' ')}` : key))
    .join('; ');
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: buildCsp() },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self)',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@finapp/ui', '@finapp/core'],
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

const baseConfig = nextConfig;

// Only wrap with Sentry when an auth token is present (i.e. real release
// builds in CI). Local dev and PRs without org secrets keep the plain config
// so they don't fail with "auth token required" errors.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const sentryOrg = process.env.SENTRY_ORG;
const sentryProject = process.env.SENTRY_PROJECT;

module.exports =
  sentryAuthToken && sentryOrg && sentryProject
    ? withSentryConfig(baseConfig, {
        org: sentryOrg,
        project: sentryProject,
        authToken: sentryAuthToken,
        silent: !process.env.CI,
        widenClientFileUpload: true,
        hideSourceMaps: true,
        disableLogger: true,
        automaticVercelMonitors: true,
      })
    : baseConfig;
