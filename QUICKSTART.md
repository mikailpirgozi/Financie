# 🚀 FinApp - Quick Start Guide

## ⚡ 5-minútový setup

### Krok 1: Získaj Supabase credentials

1. Choď na: https://supabase.com/dashboard/project/financie-web/settings/api
2. Skopíruj tieto hodnoty:
   - **Project URL** (napr. `https://abcdefgh.supabase.co`)
   - **Anon/Public Key** (začína `eyJh...`)

---

### Krok 2: Spusti setup skript

```bash
./setup-supabase.sh
```

Alebo manuálne vytvor `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tvoj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### Krok 3: Spusti databázové migrácie

**Choď na:** https://supabase.com/dashboard/project/financie-web/sql

**Spusti tieto súbory (v tomto poradí):**

#### 1️⃣ Initial Schema
```sql
-- Otvor: supabase/migrations/20240101000000_initial_schema.sql
-- Skopíruj obsah a spusti v SQL Editore
```

#### 2️⃣ RLS Policies  
```sql
-- Otvor: supabase/migrations/20240101000001_rls_policies.sql
-- Skopíruj obsah a spusti v SQL Editore
```

#### 3️⃣ Push Tokens
```sql
-- Otvor: supabase/migrations/20240102000000_push_tokens.sql
-- Skopíruj obsah a spusti v SQL Editore
```

**Alebo automaticky:**
```bash
./push-migrations.sh
```

---

### Krok 4: Reštartuj server

```bash
# Zastaviť (Ctrl+C v terminály kde beží pnpm dev)
# Spustiť znova:
pnpm dev
```

---

### Krok 5: Registruj sa! 🎉

1. Choď na: http://localhost:3000/auth/register
2. Vytvor účet
3. Prihlás sa
4. Užívaj si aplikáciu!

---

## 📊 Čo máš k dispozícii

### ✅ Kompletná funkčnosť:
- 💰 **Úvery** - 3 typy (anuita, fixná istina, interest-only)
- 💸 **Výdavky** - s kategóriami a automatickou kategorizáciou
- 💵 **Príjmy** - sledovanie príjmov
- 🏠 **Majetok** - evidencia majetku s oceňovaním
- 📈 **Mesačné výkazy** - automatické sumáre
- 📊 **Grafy** - interaktívne vizualizácie (Recharts)
- 📄 **Export** - CSV a PDF
- 🎯 **Simulácie** - predčasné splatenie, scenáre
- 👥 **Household** - multi-user, pozvánky, role
- 💳 **Subscriptions** - Stripe integrácia (voliteľné)
- 🌙 **Dark mode** - light/dark/system
- 🌍 **Multi-language** - SK/EN
- 📱 **Responsive** - mobile/tablet/desktop

### 🎨 UI Komponenty:
- **48 prémiových shadcn/ui komponentov** (New York style)
- Accordion, Alert, Avatar, Badge, Button, Calendar, Card
- Carousel, Chart, Checkbox, Command, Dialog, Drawer
- Dropdown, Form, Input, Navigation, Pagination, Popover
- Progress, Radio, Select, Sheet, Skeleton, Slider
- Switch, Table, Tabs, Textarea, Toast, Tooltip
- A ďalšie...

---

## 🔧 Troubleshooting

### Server sa nespustí?
```bash
# Zastaviť všetky procesy na porte 3000
lsof -ti:3000 | xargs kill -9
pnpm dev
```

### Chyba "Supabase client error"?
- Skontroluj `.env.local` súbor
- Overte URL a anon key
- Reštartuj server (Ctrl+C a pnpm dev)

### "Database error" alebo "relation does not exist"?
- Spusti migrácie (Krok 3)
- Skontroluj že všetky 3 migrácie boli úspešné

### Nemôžem sa registrovať?
- Skontroluj že migrácie boli spustené
- Pozri Supabase logs: https://supabase.com/dashboard/project/financie-web/logs

---

## 🎯 Ďalšie kroky

### Voliteľné: Stripe Setup (pre subscriptions)

1. Vytvor Stripe účet: https://dashboard.stripe.com
2. Vytvor 2 produkty:
   - **Pro Plan** - €9.99/mesiac
   - **Premium Plan** - €19.99/mesiac
3. Pridaj do `.env.local`:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID=price_...
```

### Voliteľné: Production Deployment

**Vercel:**
1. Push do GitHub
2. Import na vercel.com
3. Nastav environment variables
4. Deploy!

**Environment variables pre production:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (tvoja doména)
- Stripe keys (live, nie test)

---

## 📚 Dokumentácia

- **SETUP.md** - Detailný setup guide
- **IMPLEMENTATION_PLAN.md** - Kompletný implementačný plán
- **DEPLOYMENT.md** - Deployment guide
- **README.md** - Project overview

---

## 🎉 Hotovo!

Aplikácia je **100% funkčná** a **production-ready**!

**Potrebuješ pomoc?**
- Pozri dokumentáciu
- Skontroluj Supabase logs
- Všetky migrácie sú v `supabase/migrations/`

**Užívaj si FinApp!** 🚀✨

