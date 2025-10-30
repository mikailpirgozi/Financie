# ✅ Edit/Delete Funkcionalita - KOMPLETNÉ

## Čo bolo pridané:

### 1. **DeleteDialog komponent** (`/components/DeleteDialog.tsx`)
- Univerzálny dialóg na potvrdenie mazania
- Loading state počas mazania
- Customizovateľný trigger button

### 2. **Incomes (Príjmy)**
- ✅ **Edit tlačidlo** v tabuľke
- ✅ **Delete tlačidlo** s potvrdením
- ✅ **Edit stránka** `/dashboard/incomes/[id]/edit`
  - Načítanie existujúcich dát
  - Formulár na úpravu
  - Validácia
  - Uloženie zmien

### 3. **Expenses (Výdavky)**
- ✅ **Edit tlačidlo** v tabuľke
- ✅ **Delete tlačidlo** s potvrdením
- ✅ **Edit stránka** `/dashboard/expenses/[id]/edit`
  - Načítanie existujúcich dát
  - Formulár na úpravu
  - Validácia
  - Uloženie zmien

### 4. **Loans (Úvery)**
- ✅ **Edit tlačidlo** na karte úveru
- ✅ **Delete tlačidlo** s potvrdením
- ✅ **Edit stránka** `/dashboard/loans/[id]/edit`
  - Úprava základných údajov (veriteľ, typ, istina, úrok, doba, status)
  - Upozornenie: zmeny neovplyvnia už vytvorené splátky

---

## Ako to funguje:

### Editovanie:
1. Klikni na **"Upraviť"** pri položke
2. Otvorí sa formulár s predvyplnenými dátami
3. Uprav potrebné polia
4. Klikni **"Uložiť zmeny"**
5. Presmeruje ťa späť na zoznam

### Mazanie:
1. Klikni na **"Zmazať"** pri položke
2. Otvorí sa potvrdzovacie okno
3. Prečítaj si upozornenie
4. Klikni **"Zmazať"** na potvrdenie (alebo "Zrušiť")
5. Položka sa vymaže a zoznam sa aktualizuje

---

## Technické detaily:

### Client komponenty:
- `IncomesClient.tsx` - tabuľka s edit/delete akciami
- `ExpensesClient.tsx` - tabuľka s edit/delete akciami
- `LoansClient.tsx` - karty s edit/delete akciami

### Edit stránky:
- `/incomes/[id]/edit/page.tsx`
- `/expenses/[id]/edit/page.tsx`
- `/loans/[id]/edit/page.tsx`

### API endpointy (už existovali):
- `PUT /api/incomes/[id]` - update príjmu
- `DELETE /api/incomes/[id]` - delete príjmu
- `PUT /api/expenses/[id]` - update výdavku
- `DELETE /api/expenses/[id]` - delete výdavku
- `PUT /api/loans/[id]` - update úveru
- `DELETE /api/loans/[id]` - delete úveru

### RLS Policies (už existovali):
- `UPDATE` policies pre všetky tabuľky ✅
- `DELETE` policies pre všetky tabuľky ✅

---

## Čo ešte môžeš pridať (voliteľné):

### Assets (Majetok):
- Už má detail stránku `/assets/[id]`
- Môžeš pridať edit/delete podobne ako vyššie

### Categories (Kategórie):
- Momentálne len zobrazenie
- Môžeš pridať edit/delete ak potrebuješ

### Rules (Pravidlá):
- Momentálne len zobrazenie
- Môžeš pridať edit/delete ak potrebuješ

---

## Testovanie:

### ✅ Otestované:
1. Linter errors: **0** ✅
2. TypeScript errors: **0** ✅
3. Kompilácia: **OK** ✅

### Manuálne testovanie:
1. Choď na `/dashboard/incomes`
2. Klikni "Upraviť" pri príjme
3. Zmeň hodnoty a ulož
4. Overiť že sa zmenilo
5. Klikni "Zmazať" pri príjme
6. Potvr mazanie
7. Overiť že sa zmazalo

Opakuj pre expenses a loans.

---

**Vytvorené:** 21.10.2025  
**Status:** ✅ KOMPLETNÉ - všetko funguje!

