# 🔧 Riešenie problému: Stále "Žiadna domácnosť"

## Skús tieto kroky postupne:

### 1. **Tvrdý refresh prehliadača**
```
Cmd + Shift + R (Mac)
alebo
Ctrl + Shift + R (Windows/Linux)
```

### 2. **Vyčisti cache a odhláš sa**

1. Otvor DevTools (F12)
2. Choď do **Application** → **Storage**
3. Klikni na **"Clear site data"**
4. Odhláš sa z aplikácie
5. Zavri všetky taby s `localhost:3000`
6. Otvor nový tab a prihlás sa znova

### 3. **Skontroluj, pod akým emailom si prihlásený**

V prehliadači otvor DevTools (F12) a spusti v Console:

```javascript
// Skontroluj aktuálneho používateľa
fetch('/api/households/current')
  .then(r => r.json())
  .then(d => console.log('Household:', d))
  .catch(e => console.error('Error:', e));
```

### 4. **Manuálna kontrola v databáze**

Spusti tento príkaz (s tvojím heslom):

```bash
./check-user.sh
```

Alebo priamo v Supabase Dashboard:

```sql
-- Skontroluj používateľa pirgozi1@gmail.com
SELECT 
  u.email,
  u.id as user_id,
  hm.household_id,
  h.name as household_name,
  hm.role
FROM auth.users u
LEFT JOIN household_members hm ON hm.user_id = u.id
LEFT JOIN households h ON h.id = hm.household_id
WHERE u.email = 'pirgozi1@gmail.com';
```

### 5. **Ak stále nič - vytvor household manuálne**

Ak predchádzajúce kroky nepomohli, spusti znova:

```bash
./setup-households.sh
```

To vytvorí household pre všetkých používateľov, ktorí ho ešte nemajú.

### 6. **Restart dev servera**

```bash
# Zastav server (Ctrl+C)
# Potom spusti znova:
cd apps/web && pnpm dev
```

---

## 🐛 Debug info

Ak nič nepomôže, pošli mi výstup z týchto príkazov:

```bash
# 1. Skontroluj používateľa
./check-user.sh

# 2. Skontroluj server logy
# (pozri terminál kde beží pnpm dev)
```

---

## ⚡ Rýchle riešenie

Najrýchlejšie: **Odhlásiť sa → Vyčistiť cache → Prihlásiť sa znova**

