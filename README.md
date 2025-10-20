# FinApp – Inteligentná správa osobných financií

> Moderná webová a mobilná aplikácia na správu osobných financií so zameraním na úvery, výdavky, príjmy a majetok. Dôraz na automatizované výpočty (istina/úrok/poplatky), mesačné vyúčtovanie, notifikácie meškajúcich splátok a čistú UX/UI.

[![CI](https://github.com/your-org/finapp/workflows/CI/badge.svg)](https://github.com/your-org/finapp/actions)
[![License](https://img.shields.io/badge/license-Private-blue.svg)](LICENSE)

---

## 🎯 Ciele projektu

- **Prehľad o financiách** v jednom mieste (úvery, výdavky, príjmy, majetok)
- **Presné modelovanie splátok** pre 3 typy úverov (anuita, fixná istina + variabilný úrok, interest-only + balón) s poplatkami
- **Mesačný "close"** s históriou vyúčtovaní a upozorneniami na omeškanie
- **Multi-user základ** s RLS (každý vidí len svoje dáta), pozvánka partnera

---

## ✨ Hlavné funkcionality

### 💰 Úvery
- Plán splátok s rozpadom istina/úrok/poplatky
- 3 typy úverov: **anuita**, **fixná istina**, **interest-only + balón**
- Automatický výpočet zostatkov a RPMN
- Predčasné splatenie s penalizáciou
- Mesačný spracovateľský a poistný poplatok
- Day-count konvencie: **30E/360**, **ACT/360**, **ACT/365**

### 📊 Výdavky & Príjmy
- Kategórie (osobné, domácnosť/rodina)
- Tagy a pravidlá automatickej kategorizácie
- Variabilné mesačné príjmy podľa zdroja

### 🏠 Majetok
- Nákupná vs. aktuálna hodnota
- Ručné preceňovanie + voliteľný index nárastu/poklesu (napr. +10% p.a.)
- História oceňovania

### 📅 Mesačné vyúčtovanie
- Príjmy vs. výdavky
- Rozpad kategórií
- Splatená istina vs. úroky
- Zostatky úverov
- Čistá hodnota (net worth)

### 🔔 Notifikácie
- Push notifikácie po dátume splatnosti (D+1, D+5)
- Mesačný sumár po uzávierke
- E-mail notifikácie (voliteľné)

### 👥 Multi-user
- Účty a domácnosti (households)
- Pozvánky pre partnera
- Role: owner, member
- Predplatné (roadmapa)

---

## 🏗️ Architektúra

### Monorepo štruktúra

```
finapp/
├── apps/
│   ├── web/              → Next.js App Router (Vercel)
│   └── mobile/           → Expo React Native (iOS/Android)
├── packages/
│   ├── ui/               → Zdieľané UI komponenty (shadcn/ui)
│   └── core/             → Loan Engine, logika, Zod schémy
└── supabase/
    ├── migrations/       → DB schémy a RLS policies
    └── functions/        → Edge Functions (cron jobs)
```

### Tech Stack

| Vrstva | Technológia | Účel |
|--------|-------------|------|
| **Frontend Web** | Next.js 14 (App Router) | Webová aplikácia |
| **Frontend Mobile** | Expo (React Native) | iOS & Android |
| **Backend** | Supabase | Postgres + Auth + Edge Functions |
| **UI** | Tailwind CSS + shadcn/ui | Moderný dizajn systém |
| **State** | Zustand + React Hook Form | State management |
| **Validation** | Zod | Type-safe schemas |
| **Notifications** | Expo Push Notifications | Mobile push |
| **Deployment** | Vercel + Expo EAS | Production hosting |
| **CI/CD** | GitHub Actions | Automated testing & deployment |

---

## 🗃️ Databázový model

### Hlavné tabuľky

```sql
profiles              → Používateľské profily
households            → Domácnosti
household_members     → Členovia domácností (many-to-many)
categories            → Kategórie (income/expense/loan/asset)
loans                 → Úvery
loan_schedules        → Splátkový kalendár
payments              → Platby
expenses              → Výdavky
incomes               → Príjmy
assets                → Majetok
asset_valuations      → História oceňovania majetku
rules                 → Pravidlá automatickej kategorizácie
monthly_summaries     → Mesačné agregácie
```

### Kľúčové vlastnosti
- ✅ **RLS (Row Level Security)** na všetkých tabuľkách
- ✅ Všetky tabuľky majú `household_id` pre multi-user support
- ✅ Indexy pre optimálny výkon
- ✅ Triggery pre `updated_at` timestamps
- ✅ Check constraints pre validáciu dát

---

## 📐 Loan Engine – Výpočty úverov

### Podporované typy úverov

1. **Anuitný (Annuity)**
   - Fixná mesačná splátka
   - Úrok klesá, istina rastie
   - `Payment = Principal × (r × (1+r)^n) / ((1+r)^n - 1)`

2. **Fixná istina (Fixed Principal)**
   - Istina je konštantná každý mesiac
   - Úrok klesá s klesajúcim zostatkom
   - Celková splátka klesá v čase

3. **Interest-only + Balón**
   - Mesačne len úrok + poplatky
   - Istina (balón) splatná na konci
   - Vhodné pre investičné úvery

### Poplatky a penalizácie

- **Vstupný poplatok** (`fee_setup`) – pripočíta sa k istine
- **Mesačný poplatok** (`fee_monthly`) – každý mesiac
- **Poistenie** (`insurance_monthly`) – každý mesiac
- **Penalizácia za predčasné splatenie** – % z istiny

### Day-count konvencie

- **30E/360** (European) – používané väčšinou európskych bánk
- **ACT/360** – skutočné dni / 360
- **ACT/365** – skutočné dni / 365

### Výpočet RPMN (Effective Rate)

Automatický výpočet efektívnej ročnej percentuálnej miery nákladov vrátane všetkých poplatkov.

---

## 🚀 Rýchly štart

### Predpoklady

- Node.js 18+
- pnpm 8+
- Supabase CLI
- Expo CLI (pre mobile)

### Inštalácia

```bash
# 1. Klonuj repozitár
git clone https://github.com/your-org/finapp.git
cd finapp

# 2. Nainštaluj závislosti
pnpm install

# 3. Nastav environment variables
cp .env.example .env
# Vyplň hodnoty v .env

# 4. Spusti Supabase lokálne
cd supabase
supabase start
supabase db push

# 5. Spusti web dev server
cd ..
pnpm dev

# 6. Alebo mobilnú appku
pnpm dev:mobile
```

### Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Next.js
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Expo
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🧪 Testovanie

```bash
# Všetky testy
pnpm test

# Testy s watch mode
pnpm --filter @finapp/core test:watch

# Lint
pnpm lint

# Type check
pnpm typecheck
```

### Test Coverage

- ✅ **Unit testy** – Loan Engine výpočty (anuita, fixná istina, interest-only)
- ✅ **Day-count testy** – 30E/360, ACT/360, ACT/365
- ✅ **Payment processor testy** – platby, predčasné splatenie, penalizácie
- 🔄 **Integration testy** – API endpoints, RLS policies (TODO)
- 🔄 **E2E testy** – User flows (TODO)

---

## 📱 Deployment

### Web (Vercel)

```bash
cd apps/web
vercel --prod
```

Alebo automaticky cez GitHub Actions pri push do `main`.

### Mobile (Expo EAS)

```bash
cd apps/mobile
eas build --platform all --profile production
eas submit --platform all
```

### Supabase Edge Functions

```bash
supabase functions deploy monthly-close
supabase functions deploy loan-due-reminder
supabase functions deploy generate-loan-schedule
```

Viac info v [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 🗺️ Roadmap

### ✅ Fáza 1: MVP (HOTOVO)
- [x] Monorepo setup (pnpm workspace)
- [x] Loan Engine (3 typy úverov)
- [x] Databázová schéma + RLS policies
- [x] Next.js web app setup
- [x] Expo mobile app setup
- [x] Supabase Edge Functions
- [x] CI/CD pipeline
- [x] Unit testy pre Loan Engine

### 🔄 Fáza 2: Core Features (V PROGRESE)
- [ ] API Route Handlers (úvery, výdavky, príjmy, majetok)
- [ ] UI komponenty (Dashboard, Loans, Expenses, Incomes, Assets)
- [ ] Autentifikácia a registrácia
- [ ] Formuláre pre CRUD operácie
- [ ] Mesačné vyúčtovanie UI
- [ ] Push notifikácie (Expo)

### 📅 Fáza 3: Advanced Features
- [ ] Predčasné splatenie úverov
- [ ] Simulácie (čo ak scenáre)
- [ ] Grafy a vizualizácie (Recharts)
- [ ] Export do PDF/Excel
- [ ] Pravidlá automatickej kategorizácie

### 🎨 Fáza 4: UX Enhancements
- [ ] Tmavý režim
- [ ] Responsive design optimalizácia
- [ ] Onboarding flow
- [ ] Tutoriály a nápoveda
- [ ] Multi-language support (SK/EN)

### 👥 Fáza 5: Multi-user & Monetization
- [ ] Household pozvánky (partner)
- [ ] Role management (owner/member)
- [ ] Predplatné (Stripe)
- [ ] Viac domácností na účet
- [ ] Team features

---

## 🔐 Bezpečnosť

- ✅ **Row Level Security (RLS)** – každý používateľ vidí len svoje dáta
- ✅ **Multi-user households** – zdieľanie dát s partnerom
- ✅ **Audit log** – trigger pri platbách a úpravách
- ✅ **Type-safe API** – Zod validácia na všetkých endpointoch
- ✅ **Supabase Auth** – JWT tokens, session management

---

## 📊 Monitorovanie

- **Supabase Dashboard** – DB metrics, API usage, Edge Functions logs
- **Vercel Analytics** – Web performance, build logs
- **Expo Dashboard** – Build status, crash reports
- **PostHog** (voliteľné) – User analytics, funnels, retention

---

## 🤝 Prispievanie

1. Fork repozitár
2. Vytvor feature branch (`git checkout -b feature/amazing-feature`)
3. Commit zmeny (`git commit -m 'feat: add amazing feature'`)
4. Push do branch (`git push origin feature/amazing-feature`)
5. Otvor Pull Request

### Commit Convention

Používame [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: pridanie novej funkcionality
fix: oprava bugu
docs: zmeny v dokumentácii
style: formátovanie, chýbajúce bodkočiarky
refactor: refaktoring kódu
test: pridanie testov
chore: údržba, build, dependencies
```

---

## 📄 Licencia

Private project – All rights reserved.

---

## 📞 Kontakt

Pre otázky a podporu kontaktujte tím na: [your-email@example.com](mailto:your-email@example.com)

---

## 🙏 Poďakovanie

- [Supabase](https://supabase.com) – Backend as a Service
- [Vercel](https://vercel.com) – Web hosting
- [Expo](https://expo.dev) – React Native framework
- [shadcn/ui](https://ui.shadcn.com) – UI komponenty
- [Next.js](https://nextjs.org) – React framework

---

**Vytvorené s ❤️ pre lepšiu správu osobných financií**
