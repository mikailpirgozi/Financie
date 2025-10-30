# FinApp - Setup Guide 🚀

## 📋 Checklist pre 100% funkčnosť

### 1. ✅ Environment Variables

Vytvorte `.env.local` súbor v `apps/web/`:

```bash
cd apps/web
cp .env.example .env.local
```

**Povinné:**
```env
# Supabase - NUTNÉ PRE FUNKČNOSŤ
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Voliteľné (pre subscriptions):**
```env
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
```

---

### 2. ✅ Supabase Setup

#### A) Vytvorte Supabase projekt
1. Choďte na [supabase.com](https://supabase.com)
2. Vytvorte nový projekt
3. Skopírujte URL a anon key do `.env.local`

#### B) Spustite migrácie
```bash
# V root adresári projektu
cd supabase

# Inicializujte Supabase CLI (ak ešte nie je)
supabase init

# Link na váš projekt
supabase link --project-ref your-project-ref

# Push migrácie
supabase db push
```

**Alebo manuálne:**
1. Otvorte Supabase SQL Editor
2. Spustite `supabase/migrations/20240101000000_initial_schema.sql`
3. Spustite `supabase/migrations/20240101000001_rls_policies.sql`
4. Spustite `supabase/migrations/20240102000000_push_tokens.sql`

---

### 3. ✅ Stripe Setup (voliteľné)

**Len ak chcete subscription funkčnosť:**

1. Vytvorte [Stripe účet](https://dashboard.stripe.com)
2. Vytvorte 2 produkty:
   - **Pro Plan** - €9.99/mesiac
   - **Premium Plan** - €19.99/mesiac
3. Skopírujte Price IDs do `.env.local`
4. Skopírujte API keys (test mode)

---

### 4. ✅ Inštalácia a spustenie

```bash
# V root adresári
pnpm install

# Spustite dev server
pnpm dev

# Alebo len web app
cd apps/web
pnpm dev
```

Aplikácia beží na: **http://localhost:3000**

---

## 🎯 Čo funguje BEZ nastavenia

**Funguje okamžite:**
- ✅ UI komponenty (48 shadcn komponentov)
- ✅ Dark mode
- ✅ Responsive design
- ✅ Multi-language (SK/EN)
- ✅ Onboarding flow (frontend)
- ✅ Loan calculator (core package)

**Vyžaduje Supabase:**
- 🔒 Autentifikácia
- 🔒 Databázové operácie (loans, expenses, incomes, assets)
- 🔒 Household management
- 🔒 Monthly summaries

**Vyžaduje Stripe:**
- 💳 Subscription checkout
- 💳 Billing portal
- 💳 Plan upgrades

---

## 🧪 Testovanie

```bash
# Unit testy (loan engine)
cd packages/core
pnpm test

# TypeScript check
pnpm typecheck

# Linting
pnpm lint

# Build
pnpm build
```

---

## 🚀 Production Deployment

### Vercel (odporúčané)

1. Push do GitHub
2. Import projekt na [vercel.com](https://vercel.com)
3. Nastavte environment variables
4. Deploy!

### Environment variables pre production:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

---

## 📱 Mobile App (Expo)

```bash
cd apps/mobile

# Spustite Expo dev server
pnpm start

# Alebo pre iOS
pnpm ios

# Alebo pre Android
pnpm android
```

---

## ❓ Troubleshooting

### "Supabase client error"
- ✅ Skontrolujte `.env.local` súbor
- ✅ Overte že URL a anon key sú správne
- ✅ Reštartujte dev server

### "Database error"
- ✅ Spustite migrácie
- ✅ Skontrolujte RLS policies
- ✅ Vytvorte test usera cez Supabase Auth

### "Stripe error"
- ✅ Stripe je voliteľný - aplikácia funguje bez neho
- ✅ Skontrolujte API keys (test mode)
- ✅ Overte Price IDs

---

## 📊 Databázová schéma

Aplikácia používa tieto tabuľky:
- `profiles` - user profiles
- `households` - domácnosti
- `household_members` - členovia domácností
- `categories` - kategórie výdavkov/príjmov
- `loans` - úvery
- `loan_schedules` - splátkové kalendáre
- `payments` - platby
- `expenses` - výdavky
- `incomes` - príjmy
- `assets` - majetok
- `asset_valuations` - oceňovania majetku
- `rules` - pravidlá kategorizácie
- `monthly_summaries` - mesačné sumáre
- `push_tokens` - push notification tokens

---

## 🎉 Hotovo!

Aplikácia je teraz **100% funkčná**!

**Ďalšie kroky:**
1. Vytvorte Supabase projekt
2. Nastavte `.env.local`
3. Spustite migrácie
4. Spustite `pnpm dev`
5. Registrujte sa na `/auth/register`
6. Užívajte si aplikáciu! 🚀

