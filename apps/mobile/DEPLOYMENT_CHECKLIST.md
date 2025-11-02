# ✅ Deployment Checklist

Použij tento checklist pred každým TestFlight deploymentom.

---

## 📋 Pre-deployment

### Code Quality
- [ ] `pnpm typecheck` - bez errorov
- [ ] `pnpm lint` - bez warningov
- [ ] Všetky importy fungujú
- [ ] Žiadne `console.log` (alebo len development only)
- [ ] Žiadne `any` typy
- [ ] Žiadne `@ts-ignore`

### Funkčnosť
- [ ] Aplikácia sa spustí na iOS simulátore
- [ ] Login/Register flow funguje
- [ ] Dashboard načíta dáta
- [ ] Expenses/Incomes CRUD funguje
- [ ] Loans modul funguje
- [ ] Settings sa načítajú
- [ ] Push notifikácie fungujú (testuj na reálnom zariadení)
- [ ] Realtime updates fungujú
- [ ] Offline mode funguje (disconnect network)

### Konfigurácia
- [ ] `app.json` má správnu verziu
- [ ] `app.json` má správny buildNumber (alebo sa autoincrement)
- [ ] `eas.json` má správne Apple ID credentials
- [ ] `.env` má production Supabase credentials
- [ ] Bundle identifier je `com.finapp.app`
- [ ] Ikona a splash screen sú nastavené

### Assets
- [ ] `icon.png` (1024x1024)
- [ ] `adaptive-icon.png` (1024x1024)
- [ ] `splash.png` (výška/šírka podľa ratio)
- [ ] `notification-icon.png` (jednoduchý, monochrome)

### ENV Variables
- [ ] `EXPO_PUBLIC_SUPABASE_URL` je production URL
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` je production key
- [ ] Žiadne development/localhost URLs

---

## 🚀 Deployment

### Build
- [ ] Otvor terminál v `apps/mobile`
- [ ] Spusti: `eas build --platform ios --profile testflight --auto-submit`
- [ ] Počkaj na dokončenie (~10-20 min)
- [ ] Skontroluj build log (žiadne warningy/errory)

### Submit
- [ ] Build sa automaticky uploadol (auto-submit)
- [ ] Alebo manuálne: `eas submit --platform ios --latest`
- [ ] Skontroluj v App Store Connect → Activity

### Processing
- [ ] Choď na App Store Connect
- [ ] My Apps → FinApp → TestFlight
- [ ] Počkaj na "Processing..." → "Ready to Test" (~5-15 min)

---

## 📱 Post-deployment

### Export Compliance (prvýkrát)
- [ ] TestFlight → Build → "Provide Export Compliance Information"
- [ ] Odpovedz "NO" (ak nepoužívaš šifrovanie)
- [ ] Submit

### TestFlight Distribution
- [ ] Internal Testing → Testeri dostali notifikáciu
- [ ] Alebo manuálne: klikni "Notify Testers"

### Testerské inštrukcie
- [ ] Pošli testerom release notes
- [ ] Upozorni na nové funkcie
- [ ] Požiadaj o špecifické testovanie

### Monitoring
- [ ] Skontroluj TestFlight feedback (prvých 24h)
- [ ] Skontroluj crash reports
- [ ] Reaguj na bug reporty

---

## 🐛 Rollback Plan

Ak je build zlý:

1. **Rýchly fix:**
   ```bash
   # Oprav kód
   # Zmeň version na 1.0.X+1
   eas build --platform ios --profile testflight --auto-submit
   ```

2. **Vážny bug:**
   - App Store Connect → TestFlight
   - Vypni "Automatically Notify Testers"
   - Stiahni problémový build z distribúcie
   - Zbuilduj hotfix
   - Ručne distribuuj po overení

---

## 📝 Release Notes Template

```
🚀 Verzia 1.0.X

✨ Nové funkcie:
- [Feature 1]
- [Feature 2]

🐛 Opravy:
- Opravené [bug 1]
- Vylepšené [area 1]

📝 Zmeny:
- Aktualizované UI
- Performance improvements

🧪 Na otestovanie:
- Prosím otestujte [specific feature]
- Skúste [edge case]
```

---

## 🎯 Version Numbering

| Typ zmeny | Príklad | Použitie |
|-----------|---------|----------|
| **Patch** | 1.0.0 → 1.0.1 | Bugfix, typo, minor tweak |
| **Minor** | 1.0.0 → 1.1.0 | Nová feature, backward compatible |
| **Major** | 1.0.0 → 2.0.0 | Breaking change, veľká zmena |

**Build number:**
- Rovnaká version → autoincrement (1, 2, 3...)
- Nová version → reset na 1

---

## 🆘 Emergency Contacts

- **EAS Support:** https://expo.dev/support
- **Apple Developer Support:** https://developer.apple.com/support
- **Supabase Support:** https://supabase.com/support

---

**Posledná aktualizácia:** 2024-11-02

