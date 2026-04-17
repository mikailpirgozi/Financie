# 0003 — Service-role Supabase klient ako single helper

Date: 2026-04-17
Status: Accepted

## Context

Stripe webhook (`/api/webhooks/stripe`) musí robiť operácie naprieč
domácnosťami (priraďovať predplatné, otvárať prístup) — RLS by mu
ich zarúbla, lebo prichádza s service-role JWT alebo bez session
vôbec. Pôvodná implementácia volala bežný `createClient()`, čo
viedlo k tichým 0-row updateom: zápis prešiel z pohľadu Postgresu
ale RLS odfiltrovala riadky.

Súčasne sme nechceli mať service-role kľúč rozsypaný v rôznych
súboroch (riziko že sa raz omylom importne do client bundle-u).

## Decision

- Vytvoriť **jeden helper** `apps/web/src/lib/supabase/admin.ts`
  exponujúci `createAdminClient(): SupabaseClient`, ktorý:
  - číta `SUPABASE_SERVICE_ROLE_KEY` zo `serverEnv` (nikdy
    `process.env` priamo),
  - vyhodí runtime error ak kľúč nie je nakonfigurovaný,
  - vytvára singleton (jeden klient na proces),
  - má vypnutú session perzistenciu (`autoRefreshToken: false`,
    `persistSession: false`).
- **Pravidlo:** import `createAdminClient` je povolený iba v:
  - API routes (`apps/web/src/app/api/.../route.ts`),
  - Stripe webhook,
  - server-side cron callbackoch (Edge Functions, scheduled tasks).
- Nikdy v RSC, client komponente, mobile aplikácii.
- ESLint pravidlo (TODO: pridať custom rule alebo `no-restricted-imports`)
  by malo toto vynucovať. Zatiaľ to vynucuje code review.

## Consequences

- Ak sa raz objaví bug "operácia tichom prejde ale nič neuloží",
  prvé miesto na pozretie je či volajúci náhodou nepoužil bežný
  klient namiesto `createAdminClient`.
- Service-role kľúč existuje iba v `SUPABASE_SERVICE_ROLE_KEY`
  premennej (Vercel server scope, nie `NEXT_PUBLIC_*`). Rotácia
  kľúča = update jednej premennej, žiadny redeploy logiky.
- Akýkoľvek iný framework volajúci Supabase service role v rámci
  monorepa musí mať vlastný analogický helper s rovnakými
  pravidlami (mobile to nepotrebuje).
