# Fix Tutorial Loop & App Icon - Completed

## Problémy vyriešené:

### 1. Tutorial sa opakuje dookola ✅
**Príčina:** Race condition v routing logike `_layout.tsx` pri update aplikácie

**Riešenie:**
- Pridaná ochrana proti loop v `_layout.tsx` - lepší routing guard
- Pridaný check v `onboarding.tsx` - kontroluje či už bol onboarding dokončený pri mount
- Pridaný `isNavigating` state pre prevenciu viacnásobných navigácií
- Pridané timeout delay (100ms) pred navigáciou pre istotu, že AsyncStorage write sa dokončí

### 2. Ikona aplikácie je fialová v TestFlight ✅
**Príčina:** Chýbajúca explicitná konfigurácia iOS ikony v `app.json`

**Riešenie:**
- Pridaná explicitná `"icon"` konfigurácia do iOS sekcie v `app.json`
- Zvýšené build číslo z `3` na `4`
- Aktualizované `CFBundleVersion` v `Info.plist` na `4`

## Zmeny v súboroch:

1. **apps/mobile/app/_layout.tsx**
   - Refactoring routing logiky s lepšou ochranou proti loop
   - Pridaný StyleSheet pre odstránenie inline style warning

2. **apps/mobile/app/(auth)/onboarding.tsx**
   - Pridaný useEffect check či už bol onboarding dokončený
   - Pridaný `isNavigating` state pre prevenciu viacnásobných volaní
   - Pridané timeout delay pred navigáciou

3. **apps/mobile/app.json**
   - Pridané `"icon": "./assets/icon.png"` do iOS sekcie
   - Zvýšené `buildNumber` na `4`

4. **apps/mobile/ios/FinApp/Info.plist**
   - Aktualizované `CFBundleVersion` na `4`

## Ďalší krok - Nový TestFlight Build:

```bash
cd apps/mobile

# Build pre TestFlight
eas build --platform ios --profile testflight

# Po dokončení buildu submit do TestFlight
eas submit --platform ios --profile testflight
```

## Testovanie po update:

1. **Tutorial loop:**
   - Nainštaluj novú verziu z TestFlight
   - Pri prvom spustení by sa mal zobraziť onboarding iba raz
   - Po dokončení/preskočení onboarding by sa mal presunúť na login
   - Reštart aplikácie by nemal znova zobraziť onboarding

2. **Ikona:**
   - Po inštalácii novej verzie by ikona mala byť viditeľná (euro znak s peňaženkou)
   - Už nie fialová farba bez dizajnu

## Poznámky:

- BuildNumber zvýšené na `4` pre novú verziu
- Všetky linter errors vyriešené
- Ikona je 1024x1024px PNG s euro znakom a peňaženkou na fialovom pozadí

