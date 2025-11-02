# ⚡ TestFlight Quick Start

> Použij toto, keď už máš všetko nastavené a chceš len zbuildovať a uploadnuť novú verziu.

## 🚀 Deployment v 3 krokoch

### 1. Aktualizuj verziu

Otvor `apps/mobile/app.json` a zmeň:

```json
{
  "expo": {
    "version": "1.0.1",  // <-- Zmeň toto
    "ios": {
      "buildNumber": "1"  // <-- Zostane 1, EAS autoincrement
    }
  }
}
```

### 2. Build & Submit

```bash
cd apps/mobile
eas build --platform ios --profile testflight --auto-submit
```

### 3. Počkaj

- Build: ~10-20 min
- Upload: automaticky
- Processing (Apple): ~5-15 min
- Distribúcia testerom: automaticky

**Hotovo!** ✅

---

## 🔧 Jednorazový setup

Ak deployuješ **prvýkrát**, urob toto:

### 1. Nainštaluj EAS CLI

```bash
pnpm add -g eas-cli
```

### 2. Prihlás sa

```bash
eas login
```

### 3. Aktualizuj `eas.json`

V `apps/mobile/eas.json` nahraď placeholdery:

```json
{
  "submit": {
    "testflight": {
      "ios": {
        "appleId": "tvoj@email.com",        // <-- Tvoj Apple ID
        "ascAppId": "1234567890",           // <-- Z App Store Connect
        "appleTeamId": "ABC123XYZ"          // <-- Z Developer Portal
      }
    }
  }
}
```

**Kde nájdem tieto hodnoty?**

- **appleId**: Tvoj Apple Developer email
- **ascAppId**: App Store Connect → My Apps → FinApp → App Information → Apple ID
- **appleTeamId**: App Store Connect → Account → Membership → Team ID

### 4. Vytvor credentials

```bash
eas credentials
```

Vyber: iOS → production → Build Credentials → Set up

---

## 📋 Pred každým deploymentom

```bash
cd apps/mobile

# Typecheck
pnpm typecheck

# Lint
pnpm lint

# Test na simulátore
pnpm ios
```

Všetko musí byť ✅ zelené!

---

## 🆘 Príkazy pre troubleshooting

```bash
# Zoznam buildov
eas build:list

# Vyčisti cache a skús znovu
eas build --platform ios --profile testflight --clear-cache

# Manuálny submit (ak auto-submit zlyhá)
eas submit --platform ios --latest

# Credentials check
eas credentials
```

---

## 📊 Monitoring

- **Buildy:** https://expo.dev
- **TestFlight:** https://appstoreconnect.apple.com → My Apps → FinApp → TestFlight
- **Crashlytics:** (pridaj neskôr pre crash reporting)

---

## 🎯 Tipsy

1. **Verziovanie:**
   - Bugfix: 1.0.0 → 1.0.1
   - Feature: 1.0.0 → 1.1.0
   - Breaking: 1.0.0 → 2.0.0

2. **Build trvá dlho?**
   - Bežné: 10-20 min
   - Prvý build: 20-30 min
   - Prebieha paralelne na cloude

3. **Testeri nedostali notifikáciu?**
   - App Store Connect → TestFlight → Internal Testing → Notify Testers

4. **Chceš interne otestovať pred TestFlightom?**
   ```bash
   eas build --platform ios --profile preview
   ```
   Stiahne sa `.ipa`, inštaluj cez Xcode alebo installers.

---

**Kompletný guide:** `TESTFLIGHT_GUIDE.md`

