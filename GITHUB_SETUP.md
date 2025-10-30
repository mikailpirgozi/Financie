# GitHub Actions & Vercel Setup Guide

## 📋 Krok 1: Vercel Project Details

Potrebuješ získať z Vercel Dashboard:
https://vercel.com/blackrents-projects/financie-web/settings

### Ako nájsť tieto hodnoty:

1. **Project ID**
   - Ide do: Settings > General
   - Hľadaj "Project ID" – skopíruj hodnotu
   
2. **Team/Org ID**
   - Z URL: `vercel.com/[ORG-ID]/[PROJECT]`
   - Alebo: Settings > Team > Team ID

3. **Vercel Token** (pre CI/CD)
   - Ide do: https://vercel.com/account/tokens
   - Vytvor nový token s názvom "GitHub Actions"
   - Vybrat scope: Full Access
   - Skopíruj ho (vidíš ho len raz!)

---

## 📋 Krok 2: GitHub Secrets Setup

Ide do: https://github.com/mikailpirgozi/Financie/settings/secrets/actions

**Pridaj tieto Secrets:**

### Vercel Deployment
- `VERCEL_TOKEN` = token z Vercel (Krok 1)
- `VERCEL_ORG_ID` = Team ID z Vercel
- `VERCEL_PROJECT_ID` = Project ID z Vercel

### Supabase (Pre Build)
- `NEXT_PUBLIC_SUPABASE_URL` = tvoj Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tvoj anon key

---

## 🔗 Workflow

Workflow je v: `.github/workflows/ci-cd.yml`

**Čo robí:**
1. Keď pushneš na `main` alebo `develop` → **lint + typecheck**
2. Ak je všetko OK → **build web app**
3. Ak je push na `main` → **automatický deploy na Vercel** ✅

**Keď sa PR creáte na `main`:**
- Bežia lint + typecheck (ako checks)
- Deployment sa nespúšťa (iba na merge)

---

## ✅ Post-Setup Checklist

- [ ] Máš Vercel Project ID
- [ ] Máš Vercel Org ID
- [ ] Máš Vercel Token
- [ ] Máš Supabase URL & Anon Key
- [ ] Všetky Secrets sú v GitHub
- [ ] Skúšaš push na `main` → workflow sa spustí automaticky

---

## 🚀 Test Deploy

```bash
# 1. Commit changes
git add .
git commit -m "chore: setup github actions and env templates"

# 2. Push na main
git push origin main

# 3. Ide do: https://github.com/mikailpirgozi/Financie/actions
# Sleduj workflow ci-cd.yml
```

Mal by si vidieť:
- ✅ Lint & Typecheck
- ✅ Build Web App
- ✅ Deploy to Vercel (iba na main)

---

## 🔧 Troubleshooting

### Workflow zlyhá na Lint/Typecheck
- Skúsi: `pnpm lint` a `pnpm typecheck` lokálne
- Oprav errory a pushni znova

### Deployment zlyhá
- Skontroluj GitHub Secrets (ci sú správne vyplnené)
- Overte v Vercel Dashboard či sú env vars nastavené

### Build environment variables chýbajú
- Sekcia `build-web` má `env` - potrebuješ GitHub Secrets
- Alebo v Vercel Dashboard > Settings > Environment Variables

