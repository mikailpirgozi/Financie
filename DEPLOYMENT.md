# Deployment Guide

## Prerequisites

- Supabase project
- Vercel account (for web)
- Expo account (for mobile)
- GitHub repository

## Environment Variables

### Web (Vercel)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Mobile (Expo)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Setup

### 1. Create Project

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref your-project-ref

# Push migrations
npx supabase db push
```

### 2. Deploy Edge Functions

```bash
# Deploy all functions
npx supabase functions deploy monthly-close
npx supabase functions deploy loan-due-reminder
npx supabase functions deploy generate-loan-schedule
```

### 3. Setup Cron Jobs

In Supabase Dashboard → Database → Cron Jobs:

```sql
-- Monthly close (runs on 1st of each month at 00:00)
SELECT cron.schedule(
  'monthly-close',
  '0 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/monthly-close',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);

-- Loan due reminder (runs daily at 09:00)
SELECT cron.schedule(
  'loan-due-reminder',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/loan-due-reminder',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

## Web Deployment (Vercel)

### Option 1: Vercel Dashboard

1. Import GitHub repository
2. Select `apps/web` as root directory
3. Set environment variables
4. Deploy

### Option 2: Vercel CLI

```bash
cd apps/web
vercel --prod
```

### GitHub Actions

Automatic deployment on push to `main` branch via `.github/workflows/deploy-web.yml`.

Required secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Mobile Deployment (Expo EAS)

### 1. Setup EAS

```bash
cd apps/mobile
eas login
eas build:configure
```

### 2. Build

```bash
# Development build
eas build --profile development --platform all

# Production build
eas build --profile production --platform all
```

### 3. Submit to Stores

```bash
# iOS
eas submit --platform ios

# Android
eas submit --platform android
```

### GitHub Actions

Automatic build on push to `main` branch via `.github/workflows/deploy-mobile.yml`.

Required secrets:
- `EXPO_TOKEN`

## Database Backups

### Automated Backups

Supabase provides automatic daily backups on paid plans.

### Manual Backup

```bash
# Export database
pg_dump -h db.your-project.supabase.co -U postgres -d postgres > backup.sql

# Restore database
psql -h db.your-project.supabase.co -U postgres -d postgres < backup.sql
```

## Monitoring

### Supabase Dashboard

- Database metrics
- API usage
- Edge Functions logs

### Vercel Dashboard

- Web analytics
- Build logs
- Performance metrics

### Expo Dashboard

- Build status
- Crash reports
- Update metrics

## Troubleshooting

### Database Connection Issues

Check RLS policies and ensure service role key is used for Edge Functions.

### Build Failures

1. Clear cache: `pnpm clean`
2. Reinstall dependencies: `pnpm install`
3. Check environment variables

### Edge Function Errors

Check logs in Supabase Dashboard → Edge Functions → Logs.

## Rollback

### Web

```bash
# Rollback to previous deployment
vercel rollback
```

### Mobile

Publish previous update via Expo:

```bash
eas update --branch production --message "Rollback"
```

### Database

Restore from backup in Supabase Dashboard.

