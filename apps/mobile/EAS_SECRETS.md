# EAS Secrets pre Mobile Build

`eas.json` už **neobsahuje** plain-text Supabase URL/anon key ani API URL.
Tieto premenné je potrebné nastaviť v EAS Secrets, aby ich Expo build pipeline
poznal pre `preview` aj `production` profil.

## Nastavenie

```bash
# Z apps/mobile/
cd apps/mobile

# Production
eas env:create --environment production \
  --name EXPO_PUBLIC_API_URL \
  --value "https://financie-web.vercel.app"

eas env:create --environment production \
  --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://agccohbrvpjknlhltqzc.supabase.co"

eas env:create --environment production \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "<anon-key-z-Supabase-dashboardu>"

# Preview (môže ukazovať na rovnaké URL ako production, alebo na staging)
eas env:create --environment preview \
  --name EXPO_PUBLIC_API_URL \
  --value "https://financie-web.vercel.app"

eas env:create --environment preview \
  --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://agccohbrvpjknlhltqzc.supabase.co"

eas env:create --environment preview \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "<anon-key-z-Supabase-dashboardu>"
```

## Sentry (voliteľné, ale odporúčané pre produkciu)

```bash
# Zistiť DSN: Sentry → Settings → Projects → finapp-mobile → Client Keys (DSN)
eas env:create --environment production \
  --name EXPO_PUBLIC_SENTRY_DSN \
  --value "https://<id>@<org>.ingest.sentry.io/<project>"

eas env:create --environment production \
  --name EXPO_PUBLIC_SENTRY_ENVIRONMENT \
  --value "production"

eas env:create --environment preview \
  --name EXPO_PUBLIC_SENTRY_DSN \
  --value "https://<id>@<org>.ingest.sentry.io/<project>"

eas env:create --environment preview \
  --name EXPO_PUBLIC_SENTRY_ENVIRONMENT \
  --value "preview"
```

Bez DSN sa Sentry SDK pri starte len ticho preskočí — buildy aj dev simulátory
fungujú ďalej, len neposielajú eventy.

## Lokálny development

Pre lokálny `expo start` použi `apps/mobile/.env.development`:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=https://agccohbrvpjknlhltqzc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

## Rotácia kľúčov

Pri rotácii Supabase anon kľúča (Dashboard → Settings → API):

```bash
eas env:update --environment production \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "<novy-kluc>"
```

Build s novým kľúčom: `eas build --profile production --platform all`.
