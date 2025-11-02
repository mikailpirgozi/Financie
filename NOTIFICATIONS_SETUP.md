# 🔔 Nastavenie Notifikácií - Návod

> **Dátum:** 2. november 2024  
> **Implementované:** P0 #2 - Notifikácie na splátky po splatnosti

---

## ✅ Čo je implementované

### 1. **Mobile Visual Indicators**
- ⚠️ Alert banner na Dashboard (žltý, klikateľný)
- 🔴 Badge na Loans tab (červené číslo)
- Real-time updates cez Supabase subscriptions

### 2. **Push Notifications Library**
- Expo Notifications integrácia
- Automatická registrácia push tokenov
- Lokálne scheduled notifications pre splátky
- Deep linking do loan detail pri kliknutí

### 3. **Database Functions**
```sql
-- Počítanie overdue splátok
count_overdue_installments(p_household_id UUID)

-- Detail overdue úverov
get_overdue_loans(p_household_id UUID)
```

### 4. **Edge Function pre Email Reminders**
- Funkcia: `loan-due-reminder`
- Odosiela emaily pre overdue splátky
- HTML templated emails s detailmi

---

## 🚀 Aktivácia Push Notifikácií

### Krok 1: Povolenia na zariadení

Po prvom prihlásení užívateľa sa automaticky zobrazí iOS/Android prompt:
```
"FinApp" Would Like to Send You Notifications
  [Don't Allow]  [Allow]
```

### Krok 2: Automatické Scheduled Notifications

Aplikácia automaticky plánuje notifikácie:

| Typ | Kedy | Príklad |
|-----|------|---------|
| 🔔 Reminder | 3 dni pred splatnosťou | "O 3 dni je splatná splátka..." |
| ⚠️ Due Today | V deň splatnosti | "Dnes by ste mali zaplatiť..." |
| 🚨 Overdue | Okamžite pre po splatnosti | "Splátka 5 dní po splatnosti" |

**Všetko funguje offline** - notifikácie sú lokálne, bez potreby servera.

---

## 📧 Aktivácia Email Notifikácií (Optional)

### Supabase Dashboard Setup

1. **Prejdi do Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/<YOUR_PROJECT_ID>
   ```

2. **Naviguj na Edge Functions:**
   - Sidebar → Edge Functions
   - Nájdi `loan-due-reminder`

3. **Aktivuj Cron Job:**
   ```
   Schedule: 0 9 * * *
   (Každý deň o 9:00 AM)
   ```

4. **Environment Variables:**
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   APP_URL=https://finapp.sk
   ```

5. **Test Run:**
   ```bash
   curl -X POST https://<project-ref>.supabase.co/functions/v1/loan-due-reminder \
     -H "Authorization: Bearer <anon-key>"
   ```

---

## 🧪 Testovanie

### Test 1: Visual Indicators

1. Vytvor úver s due date v minulosti
2. Obnov dashboard (pull-to-refresh)
3. ✅ Mal by sa zobraziť žltý alert banner
4. ✅ Loans tab má červený badge

### Test 2: Push Notifications

1. V simulátore/zariadení prejdi na Loans
2. Swipe vpravo na pending splátku
3. Klikni "Uhradiť"
4. ✅ Notification s vibráciou a zvukom

### Test 3: Deep Linking

1. Zatvori aplikáciu (ale nechaj v pozadí)
2. Počkaj na notifikáciu
3. Tap na notifikáciu
4. ✅ Otvorí detail úveru

### Test 4: Realtime Badge Updates

1. Na zariadení A označte splátku ako paid
2. Na zariadení B (rovnaký household)
3. ✅ Badge count sa aktualizuje automaticky

---

## 📱 Notification Types

```typescript
// Reminder (3 days before)
{
  title: "🔔 Pripomienka splátky"
  body: "O 3 dni je splatná splátka..."
  data: { loanId, installmentId, type: 'reminder' }
}

// Due Today
{
  title: "⚠️ Dnes je splatnosť!"
  body: "Dnes by ste mali zaplatiť splátku..."
  data: { loanId, installmentId, type: 'due_today' }
}

// Overdue
{
  title: "🚨 Splátka po splatnosti!"
  body: "Splátka je X dní po splatnosti"
  data: { loanId, installmentId, type: 'overdue' }
}
```

---

## 🔧 Troubleshooting

### Push tokeny sa neukladajú

**Check:**
```sql
SELECT * FROM push_tokens WHERE user_id = auth.uid();
```

**Fix:**
```typescript
// apps/mobile/src/lib/notifications.ts
// Token sa uloží pri login cez onAuthStateChange
```

### Notifikácie sa nezobrazia

1. **iOS:** Skontroluj Settings → FinApp → Notifications
2. **Android:** Skontroluj App Info → Notifications
3. **Simulator:** Push notifikácie nefungujú v iOS simulátore!

### Badge count je nesprávny

**Refresh RPC funkciu:**
```sql
SELECT count_overdue_installments('<household_id>');
```

**Resubscribe realtime:**
```typescript
// Reštartuj app alebo odhlás/prihlás sa
```

---

## 📊 Monitoring

### Supabase Dashboard

1. **Push Tokens:**
   ```sql
   SELECT COUNT(*), platform 
   FROM push_tokens 
   GROUP BY platform;
   ```

2. **Overdue Loans:**
   ```sql
   SELECT * FROM get_overdue_loans('<household_id>');
   ```

3. **Realtime Subscriptions:**
   - Dashboard → Realtime → Active Connections

---

## 🎯 Next Steps

### Priority Improvements:

1. **P1:** Batch push notifications cez Supabase Edge Function
2. **P1:** User preferences pre notification timing
3. **P2:** Rich notifications s action buttons
4. **P2:** Notification history v Settings

### Optional Enhancements:

- Customizable notification sounds
- Quiet hours support
- Weekly summary notifications
- Payment success notifications

---

**Implementované:** ✅ Všetky P0 CRITICAL features  
**Čas implementácie:** ~4 hodiny  
**Status:** Production Ready 🚀


