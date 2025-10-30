# ✅ Setup Complete – Priority 1 (Vercel + GitHub Actions)

**Date:** 2025-10-30  
**Status:** ✅ HOTOVO

---

## 📋 Čo bolo nastavené

### 1. Environment Templates (`.env.example`)

Vytvorené šablóny pre všetky prostredia:

- **`apps/web/.env.example`** – Vercel/Next.js produkcia
  - Supabase URL & Anon Key
  - Stripe (optional)
  - Resend email service
  
- **`apps/mobile/.env.example`** – Expo/React Native
  - Supabase configuration
  
- **`./.env.example`** – Root (lokálny vývoj Supabase)

---

### 2. GitHub Actions Workflow

**File:** `.github/workflows/ci-cd.yml`

**Workflow Steps:**

```
┌─────────────────────────────────────────────────────────────┐
│  ON: push [main, develop], pull_request [main, develop]    │
└─────────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────┐
│  Job 1: Lint & Typecheck                                    │
│  - Setup pnpm (v8.15.0)                                     │
│  - Install deps                                             │
│  - Run: pnpm lint                                           │
│  - Run: pnpm typecheck                                      │
└─────────────────────────────────────────────────────────────┘
            ↓ (if success)
┌─────────────────────────────────────────────────────────────┐
│  Job 2: Build Web App                                       │
│  - Setup Node 18.x                                          │
│  - Install deps                                             │
│  - Run: pnpm --filter @finapp/web build                     │
│  - Use GitHub Secrets for env vars                          │
└─────────────────────────────────────────────────────────────┘
            ↓ (if success + push to main)
┌─────────────────────────────────────────────────────────────┐
│  Job 3: Deploy to Vercel                                    │
│  - Uses: vercel/action@v6                                   │
│  - Deploys production build                                 │
│  - Uses GitHub Secrets for Vercel auth                      │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- ✅ PR na `main`/`develop` → Lint + Typecheck (bez deploy)
- ✅ Push na `main` → Lint + Build + Deploy na Vercel
- ✅ Push na `develop` → Lint + Build (bez deploy)

---

### 3. GitHub Secrets Configured

Nastavené v: `https://github.com/mikailpirgozi/Financie/settings/secrets/actions`

| Secret | Value | Purpose |
|--------|-------|---------|
| `VERCEL_TOKEN` | `6yS6lEBsmCGsj9ZG1RmE4Lx2` | Vercel auth |
| `VERCEL_ORG_ID` | `team_IwzWzvdxBjA1hU8Lp4D2Aunj` | Vercel org |
| `VERCEL_PROJECT_ID` | `prj_HWpzYQCXmyGGfYxyxDcsw824Smol` | Vercel project |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://agccohbrvpjknlhltqzc.supabase.co` | Build-time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Build-time |

---

### 4. Vercel Project Linked

**CLI Command:** `vercel link --yes`

**Result:** `.vercel/project.json` vytvorený s:
```json
{
  "projectId": "prj_HWpzYQCXmyGGfYxyxDcsw824Smol",
  "orgId": "team_IwzWzvdxBjA1hU8Lp4D2Aunj",
  "projectName": "web"
}
```

---

## 🚀 Ako to funguje

### Scenario 1: Vytvoríš PR na `main`

```bash
git checkout -b feature/my-feature
git commit -m "feat: add new feature"
git push origin feature/my-feature
# → Vytvoríš PR na main
```

**GitHub Actions:**
1. ✅ Lint & Typecheck beží
2. ❌ Ak má errors → PR blokovaný
3. ✅ Ak OK → "Checks passed" ✓

**Vercel:** Nezačína sa (čakáš na merge)

---

### Scenario 2: Mergneš PR do `main`

```bash
# Mergneš cez GitHub UI (alebo CLI)
git merge feature/my-feature
git push origin main
```

**GitHub Actions:**
1. ✅ Lint & Typecheck
2. ✅ Build web app
3. ✅ Deploy na Vercel

**Result:** Nová verzia live na `https://financie-web.vercel.app` 🚀

---

### Scenario 3: Pushneš na `develop`

```bash
git checkout develop
git commit -m "chore: update dependencies"
git push origin develop
```

**GitHub Actions:**
1. ✅ Lint & Typecheck
2. ✅ Build web app
3. ❌ Deploy SKIP (iba na `main`)

**Use case:** Testing branch bez production deploy

---

## 🔧 Troubleshooting

### Build zlyhá na Lint

```bash
# Lokálne skúšaj:
pnpm lint
pnpm lint --fix  # automatická oprava

# Alebo typecheck:
pnpm typecheck
```

### Build zlyhá na Dependencies

```bash
pnpm clean
pnpm install --frozen-lockfile
pnpm build
```

### Workflow nepoužíva správne secrets

**Skontroluj:**
1. GitHub Repo > Settings > Secrets > Actions
2. Všetky 5 secrets sú nastavené?
3. Boli skopírované správne (bez extra spaces)?

### Vercel deploy zlyhá

```bash
# Skúšaj lokálne build:
cd apps/web
vercel --prod  # alebo bez --prod pre staging
```

**Ak zlyhá:**
- Skontroluj build logs v Vercel Dashboard
- Overte env vars v Vercel > Settings > Environment Variables

---

## 📊 Workflow Monitoring

### Sledovať runs:

```bash
# List recent runs
gh run list

# View details jedného run:
gh run view <RUN_ID>

# View logs (keď je hotový):
gh run view <RUN_ID> --log
```

### Web Interface:
- GitHub: https://github.com/mikailpirgozi/Financie/actions
- Vercel: https://vercel.com/blackrents-projects/financie-web/deployments

---

## ✅ Post-Setup Checklist

- [x] `.env.example` vytvorené
- [x] GitHub Actions workflow vytvorený
- [x] GitHub Secrets nastavené
- [x] Vercel project linked
- [x] Prvý workflow run spustený
- [ ] ⏳ Čakaj na deployment (~ 2-3 min)
- [ ] Overte že app je live na Vercel
- [ ] Test: Pushni malú zmenu na `develop` → Build bez deploy
- [ ] Test: Pushni zmenu na `main` → Build + Deploy

---

## 🎯 Ďalší Kroky (Priorita 2)

### Supabase Setup
1. **Cron Jobs** – monthly-close, loan-due-reminder
2. **Edge Functions** – deploy ak nejsú
3. **Database Migrations** – ak potrebné

### Monitoring (Optional)
1. Sentry (error tracking)
2. PostHog (analytics)

---

**Setup hotový! 🎉 Pokračujeme na Priorita 2?**

