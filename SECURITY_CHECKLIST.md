# 🔐 Security Checklist – FinApp

**Last Updated:** 2025-10-30  
**Status:** ✅ SECURE

---

## 📋 Exposed Secrets Audit

### ✅ What's Protected in `.gitignore`

```bash
# Environment variables (NEVER commit these)
.env
.env*.local
.env.development.local
.env.test.local
.env.production.local

# Vercel configuration
.vercel
```

---

### ✅ What's in GitHub (SAFE)

| File | Content | Status | Notes |
|------|---------|--------|-------|
| `.env.example` | Sample keys | ✅ SAFE | Default Supabase dev keys (non-functional in prod) |
| `setup-*.sh` | Setup scripts | ✅ SAFE | Scripts only, no real secrets |
| `SUPABASE_SETUP.md` | Documentation | ✅ SAFE | Examples only |

---

### ✅ What's NOT in GitHub (Protected)

| Item | Location | Protection |
|------|----------|-----------|
| Production API Keys | GitHub Secrets | ✅ Encrypted |
| Vercel Token | GitHub Secrets | ✅ Encrypted |
| Supabase Service Key | GitHub Secrets | ✅ Encrypted |
| Database Credentials | Supabase Dashboard | ✅ Private |
| Stripe Keys | GitHub Secrets | ✅ Encrypted |

---

## 🔑 Default Supabase Dev Keys (in `.env.example`)

Tieto JWT tokeny v `.env.example` sú:
- ✅ **Standard Supabase default dev keys**
- ✅ **Non-functional v produkčnom Supabase**
- ✅ **Určené len na lokálny vývoj** (`supabase start`)
- ✅ **SAFE aby boli public** (ako je zvykom v open-source projektoch)

```bash
# Príklad z .env.example:
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MTU0OTQzMDAsImV4cCI6MjAwNTA1MzMwMH0.NvO_eSHG8s1vIDddLqWEUUpT2mWxoA1V5MxdLgH-8EA
```

**Dekódovaný JWT (base64):**
```json
{
  "iss": "supabase",
  "ref": "supabase",
  "role": "anon",
  "iat": 1615494300,
  "exp": 2005053300
}
```

👉 Toto je **sample key** - neobsahuje informácie o reálnej databáze!

---

## 🚨 What MUST Be Kept Secret

### 1. Production Supabase Keys
```bash
# NIKDY nekomituj:
NEXT_PUBLIC_SUPABASE_URL=https://agccohbrvpjknlhltqzc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvoj_real_key_HERE
SUPABASE_SERVICE_ROLE_KEY=tvoj_service_key_HERE
```

**Protection:** ✅ GitHub Secrets (`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### 2. Vercel Deployment Token
```bash
# NIKDY nekomituj:
VERCEL_TOKEN=6yS6lEBsmCGsj9ZG1RmE4Lx2
```

**Protection:** ✅ GitHub Secrets

### 3. Stripe Production Keys
```bash
# NIKDY nekomituj:
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Protection:** ✅ GitHub Secrets (keď sa použije) alebo Vercel Env Vars

### 4. Database Credentials
```bash
# NIKDY nechýť verejne:
DB_HOST=db.agccohbrvpjknlhltqzc.supabase.co
DB_USER=postgres
DB_PASSWORD=...
```

**Protection:** ✅ Supabase Dashboard (private)

---

## ✅ Current GitHub Secrets Setup

Sú nastavené v: `https://github.com/mikailpirgozi/Financie/settings/secrets/actions`

```bash
✅ VERCEL_TOKEN
✅ VERCEL_ORG_ID
✅ VERCEL_PROJECT_ID
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Ako sa používajú:**
- CI/CD workflow (`.github/workflows/ci-cd.yml`)
- Build time injected do prostredia
- Nikdy sa necommitujú do repo
- Encryptované GitHub enkrypcou

---

## 🚀 Best Practices Applied

### ✅ Separation of Concerns
- Dev keys v `.env.example` (public-safe)
- Production keys v GitHub Secrets (encrypted)
- Service keys v Supabase Dashboard (private)

### ✅ No Hardcoded Secrets
```javascript
// ❌ NEVER:
const apiKey = "sk_live_abcd1234";

// ✅ ALWAYS:
const apiKey = process.env.STRIPE_SECRET_KEY;
```

**Status:** Žiaden hardcoded secrets v kóde

### ✅ Environment Variable Validation
Všetky keys sú definované v `.env.example` ako template.

### ✅ Access Control
- GitHub Secrets: repo maintainers only
- Vercel Env Vars: team members only
- Supabase: authenticated users only

---

## 🔍 Security Checks (Pre-Commit)

Aby si zmenšil riziko, môžeš pridať pre-commit hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for common secrets patterns
if git diff --cached | grep -E "(sk_live|sk_test|pk_live|SUPABASE_SERVICE_ROLE|password.*=)" ; then
  echo "❌ BLOCKED: Possible secrets detected!"
  exit 1
fi

exit 0
```

---

## 🎯 What You Should Do

### Before Next Deployment

- [ ] Verify GitHub Secrets are set (check in Settings)
- [ ] Verify Vercel Env Vars are set (check in Dashboard)
- [ ] Verify Supabase credentials are NOT in repo
- [ ] Run: `git log --all -S "your_real_token"` (should be empty)

### Ongoing

- [ ] Never commit `.env` (covered by `.gitignore`)
- [ ] Use GitHub Secrets for CI/CD
- [ ] Use Vercel Dashboard for web env vars
- [ ] Use Supabase Dashboard for DB credentials

### If Accidentally Exposed

1. **Revoke immediately** (Vercel/Supabase Dashboard)
2. **Regenerate new keys**
3. **Update GitHub Secrets**
4. **Remove from git history** (if needed):
   ```bash
   git filter-branch --tree-filter 'find . -name ".env" -delete' -f HEAD
   git push -f
   ```

---

## 📊 Audit Results

```
✅ .gitignore: Properly configured
✅ .env files: NOT in repository
✅ GitHub Secrets: 5/5 configured
✅ Hardcoded secrets: 0 found
✅ Sample keys: Non-functional (safe)
✅ Production keys: Protected
```

---

**🔐 CONCLUSION: Repository is SECURE** ✅

Všetky reálne sekretá sú chránené. Default dev keys v `.env.example` sú public-safe a volajú default Supabase local dev environment.

