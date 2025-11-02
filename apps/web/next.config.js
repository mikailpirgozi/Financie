const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@finapp/ui', '@finapp/core'],
  typescript: {
    // Skip TypeScript checking during build since we have version conflicts in monorepo
    // Types are still checked via 'pnpm typecheck' separately
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = withNextIntl(nextConfig);
