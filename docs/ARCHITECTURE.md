# FinApp — Architecture

High-level pohľad na celý systém. Detaily pre konkrétne moduly žijú v
príslušných `README.md` v balíkoch a v jednotlivých ADR-kách v
[`docs/adr/`](./adr).

---

## 1. Systémový pohľad

```
┌────────────────┐        ┌────────────────┐        ┌─────────────────┐
│  Next.js Web   │        │  Expo Mobile   │        │  Stripe Webhook │
│  (Vercel)      │        │  (iOS/Android) │        │  (Vercel route) │
└───────┬────────┘        └────────┬───────┘        └────────┬────────┘
        │                          │                         │
        │  Supabase JS (RLS)       │  Supabase JS (RLS)      │  service role
        ▼                          ▼                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Supabase (Postgres + Auth)                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Tables  │  │  RLS       │  │ SECURITY     │  │ Materialized │  │
│  │  + Views │  │  Policies  │  │ DEFINER RPCs │  │ Views (MV)   │  │
│  └──────────┘  └────────────┘  └──────────────┘  └──────────────┘  │
│  ┌────────────────────────┐    ┌────────────────────────────────┐  │
│  │ Edge Functions (Deno)  │◄───│ pg_cron + pg_net               │  │
│  │  monthly-close         │    │  refresh_loan_metrics_safe     │  │
│  │  loan-due-reminder     │    │  refresh_dashboard_summary     │  │
│  │  generate-schedule     │    │  HTTP POST do Edge Functions   │  │
│  └────────────────────────┘    └────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
        ▲                          ▲
        │ source maps              │ events
        │                          │
┌───────┴──────┐             ┌─────┴──────┐
│   Sentry     │             │   Stripe   │
└──────────────┘             └────────────┘
```

---

## 2. Monorepo layout

```
finapp/
├── apps/
│   ├── web/      Next.js 14 App Router, Tailwind, shadcn/ui
│   └── mobile/   Expo SDK, expo-router, React Native Paper
├── packages/
│   ├── core/     Loan engine, Zod schémy, shared types, DB types
│   └── ui/       (vyhradené pre zdieľané UI primitives)
├── supabase/
│   ├── migrations/   Verzované SQL (RLS, views, RPC, cron)
│   └── functions/    Deno Edge Functions
├── scripts/      Dev tooling (gen-db-types, drift check)
└── .github/workflows/  CI/CD pipelines
```

Pravidlá:

- **`packages/core` je platforma-agnostické** — žiadny `next/*` ani
  `expo-*` import. Iba `zod`, `date-fns`, čisté TypeScript moduly.
- Web a mobile **zdieľajú typy a logiku**, ale nezdieľajú UI
  komponenty (web má Tailwind, mobile React Native).
- Každá nová tabuľka **musí mať RLS** + odpovedajúce DB typy
  regenerované cez `pnpm db:types`.

---

## 3. Dátový model (zhrnutie)

### Identita & multi-tenancy

- `auth.users` — Supabase Auth.
- `profiles` — 1:1 s `auth.users`.
- `households` — multi-user kontajner.
- `household_members(user_id, household_id, role)` — many-to-many.
  Role: `owner` | `member` (DB constraint).
- **Každá doménová tabuľka má `household_id`** → RLS politika filtruje
  podľa členstva v `household_members` aktuálneho `auth.uid()`.

### Doménové entity

| Tabuľka             | Účel                                                 |
| ------------------- | ---------------------------------------------------- |
| `loans`             | Úver (anuita / fixná istina / interest-only + balón) |
| `loan_schedules`    | Splátkový kalendár (deterministický)                 |
| `payments`          | Reálne platby (zaúčtované / scheduled)               |
| `expenses`          | Výdavky                                              |
| `incomes`           | Príjmy                                               |
| `categories`        | Hierarchia kategórií                                 |
| `assets`            | Majetok                                              |
| `asset_valuations`  | Časový rad ocenení                                   |
| `vehicles`          | Špecializovaný asset typ                             |
| `documents`         | Súbory (PDF zmluvy, faktúry)                         |
| `monthly_summaries` | Snapshot mesačnej uzávierky                          |
| `audit_logs`        | Append-only audit trail                              |

### Materialized views & RPC

- `loan_metrics` (MV) → exposované cez view `v_loan_metrics`
  (`SECURITY INVOKER`) + RPC `get_loans_with_metrics()`.
- `mv_household_dashboard_summary` (MV) → view
  `v_household_dashboard_summary` + RPC
  `get_household_dashboard_summary()`.
- Refresh jobs:
  - `refresh_loan_metrics_safe()` — pg_cron každých 5 min.
  - `refresh_dashboard_summary()` — pg_cron každých 15 min.

### `SECURITY DEFINER` funkcie

Všetky `SECURITY DEFINER` RPC majú **prvý guard**:

```sql
IF auth.uid() IS NULL THEN
  RAISE EXCEPTION 'Authentication required';
END IF;
```

a ďalej overujú že `auth.uid()` má prístup do uvedeného `household_id`
cez helper `is_household_member(auth.uid(), p_household_id)`. Tým sa
zachová efekt RLS aj v privilegovaných funkciách. Detail v
[ADR-0001](./adr/0001-rls-and-security-definer.md).

---

## 4. Web (Next.js)

- App Router, server-first.
- Supabase klienti:
  - `apps/web/src/lib/supabase/server.ts` — `createServerClient` so
    `cookies()` (request scope).
  - `apps/web/src/lib/supabase/client.ts` — `createBrowserClient` v
    React komponentoch.
  - `apps/web/src/lib/supabase/admin.ts` — `createAdminClient`,
    service role, **iba** v API routes / webhookoch / cronoch.
- Middleware: refresh session, route guards, rate limiting.
- Theming: `next-themes` (light/dark) + globálny `<Toaster />`
  (`sonner`).
- Error boundaries: `app/error.tsx`, `app/global-error.tsx`,
  generický `<ErrorBoundary />`. Všetky volajú
  `Sentry.captureException`.
- Security headers: CSP, HSTS, frame-ancestors, referrer-policy
  vrátené z `next.config.js → headers()`.

### API design

- REST cez Next.js Route Handlers (`apps/web/src/app/api/.../route.ts`).
- Vstupy validované cez `zod` schémy z `packages/core`.
- Service-role operácie iba cez `createAdminClient()`. Bežné endpointy
  používajú user-scoped klienta a spoliehajú na RLS.
- Stripe webhook (`/api/webhooks/stripe`) overí signature, pracuje
  cez admin client.

---

## 5. Mobile (Expo)

- `expo-router` (file-based, identicky ako Next.js).
- React Query pre server state, `AsyncStorage` pre offline cache.
- Supabase klient: `apps/mobile/src/lib/supabase.ts`. Logout volá
  `supabase.auth.signOut()` + `clearHouseholdCache()` +
  `queryClient.clear()` (vlož na oboch miestach: `settings.tsx` aj
  globálny listener v `_layout.tsx`).
- Push notifications: `expo-notifications`. Registrácia po úspešnom
  logine. Lokálne reminder-y `scheduleLoanReminders()` po načítaní
  loans.
- Sentry: `apps/mobile/src/lib/sentry.ts` → `initSentry()` v
  `_layout.tsx`, root komponent obalený `Sentry.wrap(...)`.

---

## 6. Loan Engine (`packages/core/src/loan-engine`)

Čistý, deterministický modul bez side-effects.

- Generátory splátkových kalendárov: `annuity`, `fixedPrincipal`,
  `interestOnlyBalloon`.
- Day-count: `30E/360`, `ACT/360`, `ACT/365` (modul `day-count.ts`).
- `payment-processor.ts` — aplikácia platby na schedule.
- `simulator.ts` — what-if scenáre + predčasné splatenie.
- **Predčasné splatenie (kanonická semantika):** penalta sa počíta
  z **prepaid amount**, NIE z aktuálneho zostatku, a NIE je
  kapitalizovaná do istiny — viď doc komenty v `simulator.ts` a
  [ADR-0002](./adr/0002-early-repayment-semantics.md).

---

## 7. CI / CD

GitHub Actions (`.github/workflows/`):

- **`ci.yml`** — `lint`, `typecheck`, `test`, `db-types-drift`,
  `e2e-web` (Playwright). Strict, žiadne `continue-on-error`.
- **`deploy-web.yml`** — Vercel production deploy z `main`.
- **`deploy-mobile.yml`** — EAS build/submit z release tagov.

Pre-commit (Husky + lint-staged) → Prettier + ESLint na zmenených
súboroch. Detail v `.lintstagedrc.json`.

---

## 8. Observability

- **Sentry** — frontend (web SPA + RSC), backend (Next.js server +
  edge runtime), mobile.
- **Audit logs** — `audit_logs` tabuľka, INSERT obmedzený RLS-kou na
  vlastné aktivity používateľa.
- **Cron audit** — tabuľka `public.cron_job_audit` (30 dní rolling),
  zaznamenáva čo `pg_cron` spúšťal.

---

## 9. Bezpečnostné princípy

1. **Zero trust voči klientovi** — RLS je jediná pravda o autorizácii.
2. **Service role nikdy z prehliadača/mobilu.** Iba server-side cez
   `createAdminClient()`.
3. **Každá `SECURITY DEFINER` funkcia má `auth.uid()` guard +
   household membership check.**
4. **Stripe webhooky** musia overiť signature pred dotknutím sa DB.
5. **CSP** — žiadne `unsafe-inline` skripty v produkcii (povolené iba
   pre `<style>` kvôli Tailwind preflight, viď `next.config.js`).
6. **Dependency audit** — `pnpm audit` ako voliteľný CI krok pred
   release-om.

---

## 10. Roadmap (architektonicky relevantné)

- Recurring transactions ako samostatná entita (zatiaľ derivované).
- Cash flow forecast 12 mesiacov (na základe loan schedules + recurring).
- Bank import (CSV) → normalizačná pipeline pred zápisom do `expenses`.
- Multi-currency: `currency` na úrovni `households`, prepočet cez ECB
  fixingy.
- AI insights — pravdepodobne externý compute s read-only prístupom
  cez RLS-friendly RPC.
