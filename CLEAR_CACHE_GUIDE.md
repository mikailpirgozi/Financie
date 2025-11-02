# 🔄 Vyčistenie Cache v Mobile App

## Problém
Po backend opravách môže mobile app stále zobrazovať staré dáta z cache.

## ✅ RIEŠENIE (JEDNODUCHÉ)

### V Mobile App:

1. **Otvoriť aplikáciu**
2. **Prejsť na**: `Settings` (⚙️) tab dole
3. **Nájsť sekciu**: `Pokročilé`
4. **Kliknúť na**: `🔄 Vyčistiť cache`
5. **Potvrdiť**: `Vyčistiť`
6. **Počkať** ~2-3 sekundy (app načíta fresh dáta)
7. **Hotovo!** ✅

### Čo sa stane:
- ✅ Vymaže sa celá React Query cache
- ✅ Automaticky sa načítajú fresh dáta zo servera
- ✅ Uvidíte aktuálne hodnoty

---

## Pre Usera: lpirgozi@gmail.com

### Kroky:
1. Otvoriť FinApp
2. Ísť na Settings (posledný tab)
3. Scrollnúť dole na "Pokročilé"
4. Kliknúť "Vyčistiť cache"
5. Potvrdiť

### Očakávaný výsledok:
Po vyčistení cache by ste mali vidieť:
- Zostatok úverov: **0 €**
- Čistá hodnota: **0 €**
- Žiadne cudzie dáta

---

## Ako to funguje

```typescript
// Settings screen má teraz:
const handleClearCache = () => {
  await queryClient.clear();        // Vymaže cache
  await queryClient.refetchQueries(); // Načíta fresh dáta
};
```

### React Query Cache:
- Dashboard data
- Loans list
- Incomes/Expenses
- Assets
- Categories
- All API responses

Všetko sa vymaže a znova načíta zo servera!

---

## Kedy použiť "Vyčistiť cache"?

✅ **Použiť keď:**
- Vidíte zastaralé dáta
- Po backend update/fix
- Dáta sa nezhodujú s webom
- Čísla vyzerajú nesprávne

❌ **Nepoužívať keď:**
- App funguje normálne
- Dáta sú OK

---

## Alternatívy (ak Vyčistiť cache nefunguje)

### 1. Force Close App
```
1. Swipe up (close app)
2. Počkať 5 sekúnd
3. Otvoriť znova
```

### 2. Reštart telefónu
```
1. Power off
2. Počkať 10 sekúnd  
3. Power on
4. Otvoriť app
```

### 3. Reinstall (last resort)
```
1. Odinštalovať FinApp
2. Reštartovať telefón
3. Nainštalovať znova
4. Prihlásiť sa
```

---

## FAQ

**Q: Stratím svoje dáta?**  
A: Nie! Vymaže sa len lokálna cache. Všetky dáta sú v databáze.

**Q: Ako často mám čistiť cache?**  
A: Len keď je problém. Normálne to nie je potrebné.

**Q: Prečo to robím manuálne?**  
A: Cache je dobrá vec (rýchlosť), ale po backend fixoch môže obsahovať staré dáta.

**Q: Bude to fungovať vždy?**  
A: Áno, garantovane vymaže lokálnu cache a načíta fresh dáta.

---

## Technické info

### Pred opravou:
- 🔴 Backend mal bug → vrátil cudzie dáta
- 🔴 Mobile app ich cachoval
- 🔴 Logout/Login nefungoval (cache persistovala)

### Po oprave:
- ✅ Backend opravený (vráti správne dáta)
- ✅ Web už funguje (žiadna cache)
- ✅ Mobile potrebuje refresh cache
- ✅ "Vyčistiť cache" to spraví jednoducho

---

**Status:** ✅ Implementované a pushnuté  
**Verzia:** 1.0.0+  
**Feature:** Dostupné vo všetkých nových buildoch

