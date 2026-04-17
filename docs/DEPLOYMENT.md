# FinApp — Deployment Guide

Kompletný návod na nasadenie web aplikácie (Vercel), mobilnej aplikácie
(Expo EAS), Supabase backendu a Stripe webhooku.

---

## 1. Prehľad prostredí

| Prostredie   | Web (Vercel)         | Mobile (Expo EAS) | Supabase project   |
| ------------ | -------------------- | ----------------- | ------------------ |
| `local`      | `pnpm dev`           | `pnpm dev:mobile` | `supabase start`   |
| `preview`    | každý PR (auto)      | EAS preview build | staging projekt    |
| `production` | `main` branch (auto) | EAS production    | production projekt |

> **Pravidlo:** preview build NIKDY nesmie ukazovať na production
> Supabase projekt. Vždy oddelená inštancia.

---

## 2. Required secrets

### GitHub Actions (Settings → Secrets → Actions)

| Secret                  | Použité v                 | Popis                            |
| ----------------------- | ------------------------- | -------------------------------- |
| `VERCEL_TOKEN`          | `deploy-web.yml`          | Token pre `vercel deploy`        |
| `VERCEL_ORG_ID`         | `deploy-web.yml`          | Organization ID                  |
| `VERCEL_PROJECT_ID`     | `deploy-web.yml`          | Web projekt ID                   |
| `EXPO_TOKEN`            | `deploy-mobile.yml`       | EAS token (`eas whoami --json`)  |
| `SUPABASE_PROJECT_REF`  | `ci.yml` (db-types-drift) | Project ref na regeneráciu typov |
| `SUPABASE_ACCESS_TOKEN` | `ci.yml` (db-types-drift) | Personal access token            |
| `SENTRY_AUTH_TOKEN`     | `deploy-web.yml`          | Source map upload pre web build  |
| `SENTRY_ORG`            | `deploy-web.yml`          | Sentry organization slug         |
| `SENTRY_PROJECT`        | `deploy-web.yml`          | Sentry project slug (web)        |

### Vercel project (Settings → Environment Variables)

| Premenná                         | Scope                | Hodnota                                 |
| -------------------------------- | -------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`       | Production + Preview | URL danej Supabase inštancie            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`  | Production + Preview | Anon key                                |
| `SUPABASE_SERVICE_ROLE_KEY`      | Production + Preview | Service role key (backend only!)        |
| `STRIPE_SECRET_KEY`              | Production + Preview | `sk_live_...` / `sk_test_...`           |
| `STRIPE_WEBHOOK_SECRET`          | Production + Preview | Z webhook nastavenia                    |
| `NEXT_PUBLIC_SENTRY_DSN`         | Production + Preview | DSN web projektu                        |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Production / Preview | `production` / `preview`                |
| `SENTRY_AUTH_TOKEN`              | Production           | Iba pre build (uploadnutie source maps) |
| `SENTRY_ORG` / `SENTRY_PROJECT`  | Production           | Pre `withSentryConfig`                  |

### Supabase database GUCs (jednorázovo)

`pg_cron` jobs pre `monthly-close` a `loan-due-reminder` volajú Edge
Functions cez `pg_net`. Po prvom nasadení nastavte:

```sql
ALTER DATABASE postgres SET app.supabase_url = 'https://<ref>.supabase.co';
ALTER DATABASE postgres SET app.service_role_key = '<service-role-key>';
```

Detailne v [`supabase/migrations/README.md`](../supabase/migrations/README.md).

---

## 3. Web — Vercel

### Prvotný setup

```bash
cd apps/web
pnpm dlx vercel login
pnpm dlx vercel link
```

Po linkovaní:

1. Doplň všetky env premenné (viď tabuľka vyššie) v Vercel UI.
2. V Settings → Git zapni "Production Branch = `main`".
3. V Settings → Build & Output skontroluj:
   - **Install command:** `pnpm install --frozen-lockfile`
   - **Build command:** `pnpm --filter @finapp/web build`
   - **Output:** `.next`

### Manuálny deploy (núdzový)

```bash
cd apps/web
pnpm dlx vercel deploy --prod
```

### Sentry source maps

`next.config.js` má `withSentryConfig`. Pri builde s
`SENTRY_AUTH_TOKEN`, `SENTRY_ORG` a `SENTRY_PROJECT` sa source mapy
nahrajú automaticky a v Sentri sú stack tracy mapované na originál.

---

## 4. Mobile — Expo EAS

### Prerekvizity

```bash
pnpm dlx eas-cli@latest login
cd apps/mobile
eas init                # ak ešte projekt nemá ID
```

### EAS Secrets

`eas.json` **neobsahuje** žiadne `EXPO_PUBLIC_*` hodnoty. Všetko cez
EAS Secrets:

```bash
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value 'https://<ref>.supabase.co'
eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value '<anon-key>'
eas env:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value '<sentry-dsn>'
eas env:create --scope project --name EXPO_PUBLIC_SENTRY_ENVIRONMENT --value 'production'
```

Detailne: [`apps/mobile/EAS_SECRETS.md`](../apps/mobile/EAS_SECRETS.md).

### Build & submit

```bash
cd apps/mobile

eas build --platform ios --profile production
eas build --platform android --profile production

eas submit --platform ios --latest
eas submit --platform android --latest
```

### OTA update (rýchly fix bez rebuild-u)

```bash
eas update --branch production --message "fix(mobile): hotfix XYZ"
```

---

## 5. Supabase

### Migrácie

Lokálne:

```bash
supabase start
supabase db push
```

Production:

```bash
supabase link --project-ref <ref>
supabase db push --linked
```

Po každej migrácii regeneruj DB typy:

```bash
SUPABASE_PROJECT_REF=<ref> SUPABASE_ACCESS_TOKEN=<pat> pnpm db:types
git add packages/core/src/database.types.ts
git commit -m "chore(db): regenerate database types"
```

CI verifikuje drift v jobe `db-types-drift`.

### Edge Functions

```bash
supabase functions deploy monthly-close
supabase functions deploy loan-due-reminder
supabase functions deploy generate-loan-schedule
```

Funkcie sú periodicky volané `pg_cron`-om (viď migrácia
`20260418200000_enable_pg_cron_jobs.sql`).

---

## 6. Stripe

1. **Webhook endpoint:** `https://<your-domain>/api/webhooks/stripe`
2. **Eventy:** `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `invoice.payment_failed`.
3. Skopíruj signing secret do `STRIPE_WEBHOOK_SECRET`.
4. Webhook používa `createAdminClient()` (service role) pre zápis.
5. Test: `stripe trigger checkout.session.completed`.

---

## 7. Release checklist

- [ ] CI zelené (`lint`, `typecheck`, `test`, `db-types-drift`,
      `e2e-web`, `build`)
- [ ] Migrácie odsúhlasené reviewerom (zvlášť RLS zmeny)
- [ ] DB typy regenerované a commitnuté
- [ ] Sentry release tag vytvorený automaticky cez `withSentryConfig`
- [ ] Mobile OTA / nový binary build podľa charakteru zmeny
- [ ] Smoke test po deploy: login → dashboard → create expense → logout
- [ ] Stripe webhook overený v Dashboard → Webhooks → Recent deliveries

---

## 8. Rollback

### Web

```bash
pnpm dlx vercel rollback        # alebo cez Vercel UI → Deployments
```

### Mobile

```bash
eas update --branch production --republish --group <previous-group-id>
```

### Supabase migration

Vytvor "down" migráciu (NIKDY neupravuj existujúcu):

```bash
supabase migration new revert_<feature_name>
# manuálne dopíš opačné DDL
supabase db push --linked
```

---

## 9. On-call & monitoring

- **Sentry alerts** → Slack `#alerts-finapp`
- **Vercel deployments** → Slack `#deploys`
- **Supabase metrics** (CPU, connections) → Supabase Dashboard
- **Cron job audit** → tabuľka `public.cron_job_audit` (rolling 30 dní)
