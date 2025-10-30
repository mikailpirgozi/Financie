# Deployment Guide - FinApp

Kompletný návod na nasadenie FinApp do produkcie.

## 📋 Predpoklady

- Supabase projekt (https://supabase.com)
- Vercel účet (https://vercel.com)
- Stripe účet (https://stripe.com) - voliteľné
- Resend účet (https://resend.com) - voliteľné
- Expo účet (https://expo.dev) - pre mobilnú aplikáciu

---

## 1. Supabase Setup

### 1.1 Vytvorenie projektu

1. Vytvorte nový projekt na https://supabase.com/dashboard
2. Poznačte si:
   - Project URL (SUPABASE_URL)
   - Anon/Public key (SUPABASE_ANON_KEY)
   - Service role key (SUPABASE_SERVICE_ROLE_KEY)

### 1.2 Spustenie migrácií

```bash
# Prihláste sa do Supabase CLI
supabase login

# Linkujte projekt
supabase link --project-ref your-project-ref

# Pushnite migrácie
supabase db push
```

Alebo manuálne v Supabase Dashboard > SQL Editor:
1. Spustite `supabase/migrations/20240101000000_initial_schema.sql`
2. Spustite `supabase/migrations/20240101000001_rls_policies.sql`
3. Spustite `supabase/migrations/20240102000000_push_tokens.sql`
4. Spustite `supabase/migrations/20240103000000_subscriptions.sql`
5. Spustite `supabase/migrations/20240103000001_audit_log.sql`

### 1.3 Edge Functions Deployment

```bash
# Deploy všetky Edge Functions
supabase functions deploy monthly-close
supabase functions deploy loan-due-reminder
supabase functions deploy generate-loan-schedule
supabase functions deploy send-push-notification
supabase functions deploy send-monthly-report
```

### 1.4 Edge Functions Secrets

V Supabase Dashboard > Edge Functions > Secrets, nastavte:
```
RESEND_API_KEY=re_...
APP_URL=https://your-app.vercel.app
```

### 1.5 Cron Jobs (voliteľné)

V Supabase Dashboard > Database > Cron Jobs:

```sql
-- Mesačný close (1. deň v mesiaci o 00:00)
SELECT cron.schedule(
  'monthly-close',
  '0 0 1 * *',
  $$SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/monthly-close',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);

-- Loan due reminders (denne o 09:00)
SELECT cron.schedule(
  'loan-due-reminder',
  '0 9 * * *',
  $$SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/loan-due-reminder',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);

-- Monthly reports (1. deň v mesiaci o 08:00)
SELECT cron.schedule(
  'send-monthly-report',
  '0 8 1 * *',
  $$SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/send-monthly-report',
    headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  )$$
);
```

---

## 2. Stripe Setup (voliteľné)

### 2.1 Vytvorenie produktov

1. Vytvorte 2 produkty v Stripe Dashboard:
   - **Pro Plan** - €9.99/mesiac
   - **Premium Plan** - €19.99/mesiac

2. Poznačte si Price IDs:
   - `NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID`
   - `NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID`

### 2.2 Webhook Setup

1. V Stripe Dashboard > Developers > Webhooks
2. Pridajte endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Vyberte eventy:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Poznačte si Webhook Secret (`STRIPE_WEBHOOK_SECRET`)

---

## 3. Resend Setup (voliteľné)

1. Vytvorte účet na https://resend.com
2. Získajte API kľúč (`RESEND_API_KEY`)
3. Overte doménu (napr. `finapp.sk`)
4. Nastavte FROM email (`RESEND_FROM_EMAIL`)

---

## 4. Vercel Deployment (Web App)

### 4.1 Pripojenie projektu

```bash
cd apps/web
vercel
```

Alebo cez Vercel Dashboard:
1. Import Git repository
2. Root Directory: `apps/web`
3. Framework Preset: Next.js

### 4.2 Environment Variables

V Vercel Dashboard > Settings > Environment Variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=FinApp <noreply@finapp.sk>
```

### 4.3 Deploy

```bash
vercel --prod
```

---

## 5. Expo/EAS Deployment (Mobile App)

### 5.1 EAS Setup

```bash
cd apps/mobile
npm install -g eas-cli
eas login
eas build:configure
```

### 5.2 Environment Variables

V `apps/mobile/eas.json`, pridajte:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
        "EXPO_PUBLIC_API_URL": "https://your-app.vercel.app"
      }
    }
  }
}
```

### 5.3 Build & Submit

```bash
# Build pre iOS a Android
eas build --platform all --profile production

# Submit do stores
eas submit --platform all
```

---

## 6. Post-Deployment Checklist

- [ ] Overte, že všetky migrácie bežia
- [ ] Otestujte registráciu a prihlásenie
- [ ] Overte, že emaily fungujú (Resend)
- [ ] Otestujte Stripe checkout flow
- [ ] Overte, že webhooky fungujú
- [ ] Otestujte Edge Functions (cron jobs)
- [ ] Overte push notifikácie (mobile)
- [ ] Skontrolujte RLS policies
- [ ] Nastavte monitoring (Sentry/PostHog)
- [ ] Vytvorte zálohy databázy

---

## 7. Monitoring & Maintenance

### Supabase Dashboard
- DB metrics, API usage
- Edge Functions logs
- Real-time queries

### Vercel Analytics
- Web performance
- Build logs
- Error tracking

### Expo Dashboard
- Build status
- Crash reports
- Update deployments

---

## 8. Troubleshooting

### Migrácie zlyhajú
```bash
# Reset databázy (POZOR: zmaže všetky dáta!)
supabase db reset

# Alebo pushnite migrácie znova
supabase db push --force
```

### Edge Functions nefungujú
- Overte secrets v Supabase Dashboard
- Skontrolujte logy v Dashboard > Edge Functions
- Overte CORS nastavenia

### Stripe webhooky nefungujú
- Overte webhook URL
- Skontrolujte webhook secret
- Testujte cez Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## 9. Scaling Considerations

### Databáza
- Upgrade Supabase plan pre viac connections
- Pridajte indexy pre často používané queries
- Nastavte connection pooling

### API Rate Limiting
- Implementované in-memory (production: Redis/Upstash)
- Upgrade na Redis pre distribuované rate limiting

### Edge Functions
- Optimalizujte pre cold starts
- Cachujte často používané dáta

---

**Deployment Guide - FinApp v1.0**

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

