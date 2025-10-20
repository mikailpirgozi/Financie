# Implementačný plán – FinApp

> **Status:** Fáza 1 (MVP Foundation) dokončená ✅ | Fáza 2 (Core Features) v progrese 🔄

---

## 📋 Prehľad fáz

| Fáza | Názov | Status | Progress |
|------|-------|--------|----------|
| **1** | MVP Foundation | ✅ Dokončené | 100% |
| **2** | Core Features | 🔄 V progrese | 20% |
| **3** | Advanced Features | ⏳ Plánované | 0% |
| **4** | UX Enhancements | ⏳ Plánované | 0% |
| **5** | Multi-user & Monetization | ⏳ Plánované | 0% |

---

## ✅ Fáza 1: MVP Foundation (DOKONČENÉ)

### 1.1 Inicializácia projektu ✅

- [x] **Monorepo setup**
  - [x] pnpm workspace konfigurácia
  - [x] Root package.json so skriptami
  - [x] .gitignore a .env.example
  - [x] README.md
  - [x] TypeScript konfigurácia (strict mode)
  - [x] ESLint konfigurácia

**Súbory:**
- ✅ `package.json`
- ✅ `pnpm-workspace.yaml`
- ✅ `tsconfig.json`
- ✅ `.eslintrc.json`
- ✅ `.gitignore`
- ✅ `README.md`

---

### 1.2 Packages/Core – Loan Engine ✅

- [x] **Základná štruktúra**
  - [x] `package.json` s dependencies (zod, vitest)
  - [x] TypeScript konfigurácia
  - [x] Export štruktúra (`src/index.ts`)

- [x] **Types & Schemas**
  - [x] `types.ts` – TypeScript typy pre celý systém
  - [x] `schemas.ts` – Zod validačné schémy
  - [x] Loan types: annuity, fixed_principal, interest_only
  - [x] Day-count conventions: 30E/360, ACT/360, ACT/365

- [x] **Loan Engine**
  - [x] `loan-engine/calculator.ts` – hlavné výpočty
  - [x] `loan-engine/day-count.ts` – day-count konvencie
  - [x] `loan-engine/schedule-generator.ts` – generovanie harmonogramu
  - [x] `loan-engine/payment-processor.ts` – spracovanie platieb
  - [x] Výpočet anuity
  - [x] Výpočet fixnej istiny
  - [x] Výpočet interest-only + balón
  - [x] Predčasné splatenie s penalizáciou
  - [x] RPMN (effective rate) výpočet

- [x] **Utils**
  - [x] `utils/index.ts` – helper funkcie
  - [x] Currency formatting
  - [x] Date formatting
  - [x] Percentage calculations

**Súbory:**
- ✅ `packages/core/package.json`
- ✅ `packages/core/src/index.ts`
- ✅ `packages/core/src/types.ts`
- ✅ `packages/core/src/schemas.ts`
- ✅ `packages/core/src/loan-engine/calculator.ts`
- ✅ `packages/core/src/loan-engine/day-count.ts`
- ✅ `packages/core/src/loan-engine/schedule-generator.ts`
- ✅ `packages/core/src/loan-engine/payment-processor.ts`
- ✅ `packages/core/src/utils/index.ts`

---

### 1.3 Unit testy ✅

- [x] **Loan Calculator testy**
  - [x] Annuity loan výpočty
  - [x] Fixed principal loan výpočty
  - [x] Interest-only loan výpočty
  - [x] Setup fees a monthly fees
  - [x] Edge cases (single payment, long-term, high rate, zero rate)

- [x] **Day-count testy**
  - [x] 30E/360 konvencia
  - [x] ACT/360 konvencia
  - [x] ACT/365 konvencia
  - [x] Leap year handling
  - [x] Helper funkcie (addMonths, getDaysInMonth)

- [x] **Payment processor testy**
  - [x] Spracovanie platieb
  - [x] Predčasné splatenie
  - [x] Penalizácie
  - [x] Payment splitting

**Súbory:**
- ✅ `packages/core/src/loan-engine/__tests__/calculator.test.ts`
- ✅ `packages/core/src/loan-engine/__tests__/day-count.test.ts`
- ✅ `packages/core/src/loan-engine/__tests__/payment-processor.test.ts`
- ✅ `packages/core/vitest.config.ts`

---

### 1.4 Packages/UI – Komponenty ✅

- [x] **Setup**
  - [x] `package.json` s dependencies (radix-ui, tailwind, lucide)
  - [x] TypeScript konfigurácia
  - [x] Export štruktúra

- [x] **Základné komponenty**
  - [x] `Button` – shadcn/ui button
  - [x] `Card` – card komponenty (Card, CardHeader, CardTitle, CardContent, CardFooter)
  - [x] `Input` – input field
  - [x] `utils.ts` – cn() helper (clsx + tailwind-merge)

**Súbory:**
- ✅ `packages/ui/package.json`
- ✅ `packages/ui/src/index.ts`
- ✅ `packages/ui/src/components/button.tsx`
- ✅ `packages/ui/src/components/card.tsx`
- ✅ `packages/ui/src/components/input.tsx`
- ✅ `packages/ui/src/lib/utils.ts`

---

### 1.5 Apps/Web – Next.js ✅

- [x] **Setup**
  - [x] `package.json` s Next.js 14, React 18, Supabase
  - [x] `next.config.js` s transpilePackages
  - [x] `tsconfig.json` s path aliases
  - [x] Tailwind konfigurácia
  - [x] PostCSS konfigurácia

- [x] **App Router štruktúra**
  - [x] `app/layout.tsx` – root layout
  - [x] `app/page.tsx` – homepage
  - [x] `app/globals.css` – Tailwind styles + CSS variables

- [x] **Supabase integrácia**
  - [x] `lib/supabase/client.ts` – browser client
  - [x] `lib/supabase/server.ts` – server client (cookies)

**Súbory:**
- ✅ `apps/web/package.json`
- ✅ `apps/web/next.config.js`
- ✅ `apps/web/tsconfig.json`
- ✅ `apps/web/tailwind.config.ts`
- ✅ `apps/web/postcss.config.js`
- ✅ `apps/web/src/app/layout.tsx`
- ✅ `apps/web/src/app/page.tsx`
- ✅ `apps/web/src/app/globals.css`
- ✅ `apps/web/src/lib/supabase/client.ts`
- ✅ `apps/web/src/lib/supabase/server.ts`

---

### 1.6 Apps/Mobile – Expo ✅

- [x] **Setup**
  - [x] `package.json` s Expo 50, React Native
  - [x] `app.json` – Expo konfigurácia
  - [x] `tsconfig.json`
  - [x] `babel.config.js`
  - [x] `eas.json` – EAS Build konfigurácia

- [x] **Expo Router**
  - [x] `app/_layout.tsx` – root layout
  - [x] `app/index.tsx` – home screen

**Súbory:**
- ✅ `apps/mobile/package.json`
- ✅ `apps/mobile/app.json`
- ✅ `apps/mobile/tsconfig.json`
- ✅ `apps/mobile/babel.config.js`
- ✅ `apps/mobile/eas.json`
- ✅ `apps/mobile/app/_layout.tsx`
- ✅ `apps/mobile/app/index.tsx`

---

### 1.7 Supabase – Databáza ✅

- [x] **Konfigurácia**
  - [x] `config.toml` – Supabase local config

- [x] **Migrácie**
  - [x] `20240101000000_initial_schema.sql` – kompletná DB schéma
    - [x] profiles
    - [x] households + household_members
    - [x] categories
    - [x] loans + loan_schedules
    - [x] payments
    - [x] expenses + incomes
    - [x] assets + asset_valuations
    - [x] rules
    - [x] monthly_summaries
    - [x] Indexy pre výkon
    - [x] Triggery pre updated_at

  - [x] `20240101000001_rls_policies.sql` – RLS policies
    - [x] Enable RLS na všetkých tabuľkách
    - [x] Helper funkcie (is_household_member, is_household_owner)
    - [x] Policies pre všetky tabuľky

**Súbory:**
- ✅ `supabase/config.toml`
- ✅ `supabase/migrations/20240101000000_initial_schema.sql`
- ✅ `supabase/migrations/20240101000001_rls_policies.sql`

---

### 1.8 Supabase Edge Functions ✅

- [x] **monthly-close**
  - [x] Výpočet mesačných sumárov pre všetky households
  - [x] Agregácia príjmov, výdavkov, loan payments
  - [x] Výpočet net worth
  - [x] Upsert do monthly_summaries
  - [x] Označenie overdue loan schedules

- [x] **loan-due-reminder**
  - [x] Detekcia overdue loan schedules
  - [x] Príprava notifikácií pre household members
  - [x] Výpočet dní omeškania

- [x] **generate-loan-schedule**
  - [x] Načítanie loan detailov
  - [x] Generovanie splátkového kalendára
  - [x] Insert do loan_schedules

**Súbory:**
- ✅ `supabase/functions/monthly-close/index.ts`
- ✅ `supabase/functions/loan-due-reminder/index.ts`
- ✅ `supabase/functions/generate-loan-schedule/index.ts`

---

### 1.9 CI/CD Pipeline ✅

- [x] **GitHub Actions**
  - [x] `ci.yml` – lint, typecheck, test, build
  - [x] `deploy-web.yml` – Vercel deployment
  - [x] `deploy-mobile.yml` – Expo EAS build

- [x] **Deployment konfigurácia**
  - [x] `apps/web/vercel.json` – Vercel config
  - [x] `apps/mobile/eas.json` – EAS Build config
  - [x] `DEPLOYMENT.md` – deployment guide

**Súbory:**
- ✅ `.github/workflows/ci.yml`
- ✅ `.github/workflows/deploy-web.yml`
- ✅ `.github/workflows/deploy-mobile.yml`
- ✅ `apps/web/vercel.json`
- ✅ `apps/mobile/eas.json`
- ✅ `DEPLOYMENT.md`

---

## 🔄 Fáza 2: Core Features (V PROGRESE - 20%)

### 2.1 API Route Handlers ⏳

- [ ] **Loans API**
  - [ ] `POST /api/loans` – vytvorenie úveru
  - [ ] `GET /api/loans` – zoznam úverov
  - [ ] `GET /api/loans/[id]` – detail úveru
  - [ ] `PUT /api/loans/[id]` – update úveru
  - [ ] `DELETE /api/loans/[id]` – zmazanie úveru
  - [ ] `POST /api/loans/[id]/pay` – zaznamenanie platby
  - [ ] `POST /api/loans/[id]/early-repayment` – predčasné splatenie
  - [ ] `GET /api/loans/[id]/schedule` – splátkový kalendár

- [ ] **Expenses API**
  - [ ] `POST /api/expenses` – vytvorenie výdavku
  - [ ] `GET /api/expenses` – zoznam výdavkov
  - [ ] `GET /api/expenses/[id]` – detail výdavku
  - [ ] `PUT /api/expenses/[id]` – update výdavku
  - [ ] `DELETE /api/expenses/[id]` – zmazanie výdavku

- [ ] **Incomes API**
  - [ ] `POST /api/incomes` – vytvorenie príjmu
  - [ ] `GET /api/incomes` – zoznam príjmov
  - [ ] `GET /api/incomes/[id]` – detail príjmu
  - [ ] `PUT /api/incomes/[id]` – update príjmu
  - [ ] `DELETE /api/incomes/[id]` – zmazanie príjmu

- [ ] **Assets API**
  - [ ] `POST /api/assets` – vytvorenie majetku
  - [ ] `GET /api/assets` – zoznam majetku
  - [ ] `GET /api/assets/[id]` – detail majetku
  - [ ] `PUT /api/assets/[id]` – update majetku
  - [ ] `DELETE /api/assets/[id]` – zmazanie majetku
  - [ ] `POST /api/assets/[id]/valuations` – pridanie oceňovania

- [ ] **Categories API**
  - [ ] `POST /api/categories` – vytvorenie kategórie
  - [ ] `GET /api/categories` – zoznam kategórií
  - [ ] `PUT /api/categories/[id]` – update kategórie
  - [ ] `DELETE /api/categories/[id]` – zmazanie kategórie

- [ ] **Monthly Summaries API**
  - [ ] `GET /api/summaries` – zoznam mesačných sumárov
  - [ ] `GET /api/summaries/[month]` – detail mesiaca

**Cieľové súbory:**
- `apps/web/src/app/api/loans/route.ts`
- `apps/web/src/app/api/loans/[id]/route.ts`
- `apps/web/src/app/api/loans/[id]/pay/route.ts`
- `apps/web/src/app/api/expenses/route.ts`
- `apps/web/src/app/api/incomes/route.ts`
- `apps/web/src/app/api/assets/route.ts`
- `apps/web/src/app/api/categories/route.ts`
- `apps/web/src/app/api/summaries/route.ts`

---

### 2.2 Autentifikácia ⏳

- [ ] **Auth pages**
  - [ ] `app/auth/login/page.tsx` – prihlásenie
  - [ ] `app/auth/register/page.tsx` – registrácia
  - [ ] `app/auth/callback/route.ts` – OAuth callback
  - [ ] `app/auth/reset-password/page.tsx` – reset hesla

- [ ] **Auth komponenty**
  - [ ] `LoginForm` – formulár na prihlásenie
  - [ ] `RegisterForm` – formulár na registráciu
  - [ ] `AuthProvider` – context pre auth state

- [ ] **Middleware**
  - [ ] `middleware.ts` – route protection

**Cieľové súbory:**
- `apps/web/src/app/auth/login/page.tsx`
- `apps/web/src/app/auth/register/page.tsx`
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/components/auth/LoginForm.tsx`
- `apps/web/src/components/auth/RegisterForm.tsx`
- `apps/web/src/middleware.ts`

---

### 2.3 Dashboard UI ⏳

- [ ] **Layout**
  - [ ] `app/(dashboard)/layout.tsx` – dashboard layout
  - [ ] `components/layout/Sidebar.tsx` – sidebar navigácia
  - [ ] `components/layout/Header.tsx` – header s user menu

- [ ] **Dashboard home**
  - [ ] `app/(dashboard)/page.tsx` – dashboard homepage
  - [ ] Prehľad financií (cards)
  - [ ] Grafy (príjmy vs výdavky)
  - [ ] Nadchádzajúce splátky
  - [ ] Upozornenia

**Cieľové súbory:**
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/(dashboard)/page.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/Header.tsx`
- `apps/web/src/components/dashboard/FinancialOverview.tsx`
- `apps/web/src/components/dashboard/UpcomingPayments.tsx`

---

### 2.4 Loans UI ⏳

- [ ] **Loans pages**
  - [ ] `app/(dashboard)/loans/page.tsx` – zoznam úverov
  - [ ] `app/(dashboard)/loans/new/page.tsx` – nový úver
  - [ ] `app/(dashboard)/loans/[id]/page.tsx` – detail úveru
  - [ ] `app/(dashboard)/loans/[id]/edit/page.tsx` – editácia úveru

- [ ] **Loans komponenty**
  - [ ] `LoansList` – tabuľka úverov
  - [ ] `LoanCard` – karta úveru
  - [ ] `LoanForm` – formulár na vytvorenie/editáciu
  - [ ] `LoanSchedule` – splátkový kalendár
  - [ ] `PaymentForm` – formulár na platbu
  - [ ] `EarlyRepaymentForm` – formulár na predčasné splatenie

**Cieľové súbory:**
- `apps/web/src/app/(dashboard)/loans/page.tsx`
- `apps/web/src/app/(dashboard)/loans/new/page.tsx`
- `apps/web/src/app/(dashboard)/loans/[id]/page.tsx`
- `apps/web/src/components/loans/LoansList.tsx`
- `apps/web/src/components/loans/LoanForm.tsx`
- `apps/web/src/components/loans/LoanSchedule.tsx`

---

### 2.5 Expenses & Incomes UI ⏳

- [ ] **Expenses pages**
  - [ ] `app/(dashboard)/expenses/page.tsx` – zoznam výdavkov
  - [ ] `app/(dashboard)/expenses/new/page.tsx` – nový výdavok

- [ ] **Incomes pages**
  - [ ] `app/(dashboard)/incomes/page.tsx` – zoznam príjmov
  - [ ] `app/(dashboard)/incomes/new/page.tsx` – nový príjem

- [ ] **Komponenty**
  - [ ] `ExpensesList` – tabuľka výdavkov
  - [ ] `ExpenseForm` – formulár na výdavok
  - [ ] `IncomesList` – tabuľka príjmov
  - [ ] `IncomeForm` – formulár na príjem
  - [ ] `CategorySelect` – výber kategórie

**Cieľové súbory:**
- `apps/web/src/app/(dashboard)/expenses/page.tsx`
- `apps/web/src/app/(dashboard)/incomes/page.tsx`
- `apps/web/src/components/expenses/ExpensesList.tsx`
- `apps/web/src/components/expenses/ExpenseForm.tsx`
- `apps/web/src/components/incomes/IncomesList.tsx`
- `apps/web/src/components/incomes/IncomeForm.tsx`

---

### 2.6 Assets UI ⏳

- [ ] **Assets pages**
  - [ ] `app/(dashboard)/assets/page.tsx` – zoznam majetku
  - [ ] `app/(dashboard)/assets/new/page.tsx` – nový majetok
  - [ ] `app/(dashboard)/assets/[id]/page.tsx` – detail majetku

- [ ] **Komponenty**
  - [ ] `AssetsList` – tabuľka majetku
  - [ ] `AssetForm` – formulár na majetok
  - [ ] `AssetValuations` – história oceňovania
  - [ ] `ValuationForm` – formulár na oceňovanie

**Cieľové súbory:**
- `apps/web/src/app/(dashboard)/assets/page.tsx`
- `apps/web/src/app/(dashboard)/assets/new/page.tsx`
- `apps/web/src/app/(dashboard)/assets/[id]/page.tsx`
- `apps/web/src/components/assets/AssetsList.tsx`
- `apps/web/src/components/assets/AssetForm.tsx`

---

### 2.7 Monthly Summaries UI ⏳

- [ ] **Summaries pages**
  - [ ] `app/(dashboard)/summaries/page.tsx` – zoznam mesiacov
  - [ ] `app/(dashboard)/summaries/[month]/page.tsx` – detail mesiaca

- [ ] **Komponenty**
  - [ ] `MonthlySummaryCard` – karta mesiaca
  - [ ] `SummaryChart` – graf príjmov vs výdavkov
  - [ ] `CategoryBreakdown` – rozpad kategórií
  - [ ] `NetWorthChart` – vývoj net worth

**Cieľové súbory:**
- `apps/web/src/app/(dashboard)/summaries/page.tsx`
- `apps/web/src/app/(dashboard)/summaries/[month]/page.tsx`
- `apps/web/src/components/summaries/MonthlySummaryCard.tsx`
- `apps/web/src/components/summaries/SummaryChart.tsx`

---

### 2.8 Push Notifications ⏳

- [ ] **Expo setup**
  - [ ] Expo Notifications konfigurácia
  - [ ] Push token registrácia
  - [ ] Notification handler

- [ ] **Backend integrácia**
  - [ ] Uloženie push tokenov do DB
  - [ ] Edge Function pre odosielanie notifikácií
  - [ ] Integrácia s loan-due-reminder

**Cieľové súbory:**
- `apps/mobile/src/lib/notifications.ts`
- `supabase/functions/send-push-notification/index.ts`
- `supabase/migrations/20240102000000_push_tokens.sql`

---

## ⏳ Fáza 3: Advanced Features (PLÁNOVANÉ)

### 3.1 Predčasné splatenie a simulácie
- [ ] UI pre predčasné splatenie
- [ ] Simulátor "čo ak" scenárov
- [ ] Porovnanie rôznych stratégií splácania

### 3.2 Grafy a vizualizácie
- [ ] Recharts integrácia
- [ ] Interaktívne grafy
- [ ] Export grafov do PNG

### 3.3 Export a reporting
- [ ] Export do PDF (mesačné výkazy)
- [ ] Export do Excel
- [ ] Custom reporty

### 3.4 Pravidlá kategorizácie
- [ ] UI pre správu pravidiel
- [ ] Automatická kategorizácia výdavkov/príjmov
- [ ] Machine learning suggestions (budúcnosť)

---

## ⏳ Fáza 4: UX Enhancements (PLÁNOVANÉ)

### 4.1 Tmavý režim
- [ ] Dark mode toggle
- [ ] CSS variables pre dark theme
- [ ] Persistence v localStorage

### 4.2 Responsive design
- [ ] Mobile-first optimalizácia
- [ ] Tablet layout
- [ ] Desktop wide screens

### 4.3 Onboarding
- [ ] Welcome flow
- [ ] Tutoriály
- [ ] Sample data pre demo

### 4.4 Multi-language
- [ ] i18n setup (next-intl)
- [ ] Slovenčina (default)
- [ ] Angličtina

---

## ⏳ Fáza 5: Multi-user & Monetization (PLÁNOVANÉ)

### 5.1 Household management
- [ ] Pozvánky pre partnera
- [ ] Role management UI
- [ ] Permissions

### 5.2 Predplatné
- [ ] Stripe integrácia
- [ ] Subscription plans
- [ ] Payment flow
- [ ] Billing portal

### 5.3 Team features
- [ ] Viac domácností na účet
- [ ] Household switching
- [ ] Shared categories

---

## 📊 Celkový progress

```
Fáza 1: ████████████████████ 100% ✅
Fáza 2: ████░░░░░░░░░░░░░░░░  20% 🔄
Fáza 3: ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Fáza 4: ░░░░░░░░░░░░░░░░░░░░   0% ⏳
Fáza 5: ░░░░░░░░░░░░░░░░░░░░   0% ⏳
─────────────────────────────────
Celkom: ████░░░░░░░░░░░░░░░░  24% 🔄
```

---

## 🎯 Najbližšie kroky (Priority)

1. **API Route Handlers** – implementácia všetkých CRUD endpointov
2. **Autentifikácia** – login, register, middleware
3. **Dashboard UI** – základný layout a homepage
4. **Loans UI** – zoznam, detail, formuláre
5. **Expenses & Incomes UI** – CRUD operácie

---

## 📝 Poznámky

- **Loan Engine** je plne funkčný a otestovaný ✅
- **Databázová schéma** je pripravená s RLS policies ✅
- **CI/CD pipeline** je nastavený pre automatické deploymenty ✅
- **Monorepo** je správne nakonfigurované s pnpm workspace ✅

**Ďalší krok:** Začať s implementáciou API Route Handlers a autentifikácie.

---

**Posledná aktualizácia:** 2024-01-20

