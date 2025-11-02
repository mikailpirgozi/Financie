# 🚀 TestFlight Deployment Guide

## Príprava (jednorazovo)

### 1️⃣ Apple Developer Account
1. Choď na https://developer.apple.com
2. Registruj sa ($99/rok)
3. Počkaj na schválenie (24-48h)

### 2️⃣ Vytvor App ID
1. https://developer.apple.com/account/resources/identifiers/list
2. Klikni **"+"** → **App IDs** → **App**
3. Vyplň:
   - **Description:** FinApp
   - **Bundle ID:** `com.finapp.app`
   - **Capabilities:** Push Notifications ✅
4. **Register**

### 3️⃣ App Store Connect
1. https://appstoreconnect.apple.com
2. **My Apps** → **"+"** → **New App**
3. Vyplň:
   - **Platform:** iOS
   - **Name:** FinApp
   - **Primary Language:** Slovak
   - **Bundle ID:** `com.finapp.app`
   - **SKU:** `finapp-001`
4. **Create**
5. **Poznač si:**
   - **Apple ID** (ASC App ID) - v URL alebo App Information
   - **Team ID** - v Account → Membership

---

## Setup (jednorazovo)

### 4️⃣ Nainštaluj EAS CLI

```bash
cd apps/mobile
pnpm add -g eas-cli
```

### 5️⃣ Prihlás sa

```bash
eas login
```

Vytvor/použij Expo účet (https://expo.dev)

### 6️⃣ Inicializuj projekt

```bash
eas build:configure
```

Toto vygeneruje `projectId` v `app.json`.

### 7️⃣ Aktualizuj `eas.json`

Otvor `apps/mobile/eas.json` a nahraď:
- `TVOJ_APPLE_ID@example.com` → tvoj Apple ID email
- `TVOJ_ASC_APP_ID` → ASC App ID z kroku 3
- `TVOJ_TEAM_ID` → Team ID z App Store Connect

```json
{
  "submit": {
    "testflight": {
      "ios": {
        "appleId": "tvoj@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABC123XYZ"
      }
    }
  }
}
```

### 8️⃣ Vytvor certifikáty

```bash
eas credentials
```

Vyber:
- **iOS** → **production** → **Build Credentials** → **Set up**
- EAS automaticky vygeneruje certifikáty a provisioning profiles

---

## Build a Deploy (vždy)

### 9️⃣ Skontroluj environment

Uisti sa, že máš správne nastavené ENV premenné:

```bash
cat .env
```

Potrebuješ:
```env
EXPO_PUBLIC_SUPABASE_URL=https://tvoja-url.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tvoj-anon-key
```

### 🔟 Spusti build pre TestFlight

```bash
cd apps/mobile
eas build --platform ios --profile testflight
```

**Príkaz:**
- Vezme tvoj kód
- Zbuilduje iOS aplikáciu (na cloude)
- Vytvorí `.ipa` súbor
- Trvá ~10-20 minút

**Output:**
```
✔ Build finished
📱 Build URL: https://expo.dev/accounts/.../builds/...
```

### 1️⃣1️⃣ Nahraj na TestFlight

Máš **2 možnosti**:

#### **Možnosť A: Automatické nahratie (odporúčané)**

```bash
eas submit --platform ios --profile testflight
```

EAS automaticky:
1. Stiahne `.ipa` z buildu
2. Nahraj na App Store Connect
3. Začne spracovanie

#### **Možnosť B: Manuálne nahratie**

1. Stiahni `.ipa` z EAS build URL
2. Otvor **Transporter** app (Mac App Store)
3. Prihlás sa Apple ID
4. Pretiahni `.ipa` do Transportera
5. Klikni **Deliver**

### 1️⃣2️⃣ Spracovanie (Apple)

1. Choď na https://appstoreconnect.apple.com
2. **My Apps** → **FinApp** → **TestFlight**
3. Počkaj 5-15 minút na spracovanie
4. Status sa zmení: **Processing** → **Ready to Test**

### 1️⃣3️⃣ Pridaj testerov

#### **Interní testeri** (až 100, bez review):
1. TestFlight → **Internal Testing** → **"+"**
2. Vytvor skupinu: "Team"
3. Pridaj testerov (email adresy)
4. Aplikácia sa automaticky distribuuje

#### **Externí testeri** (až 10,000, vyžaduje review):
1. TestFlight → **External Testing** → **"+"**
2. Vytvor skupinu: "Beta Testers"
3. Pridaj build
4. Vyplň "What to Test" (testovacia poznámka)
5. Submit for Review
6. Počkaj 24-48h na schválenie

### 1️⃣4️⃣ Testeri inštalujú

1. Testeri dostanú email s inštruktáziami
2. Musia si nainštalovať **TestFlight** app (App Store)
3. Kliknú na link v emaili
4. Accept invite
5. Install

---

## Aktualizácia (nová verzia)

### Variant 1: Patch (1.0.0 → 1.0.1)

```bash
cd apps/mobile

# Zmeň version v app.json
# "version": "1.0.1"

eas build --platform ios --profile testflight --auto-submit
```

### Variant 2: Minor (1.0.0 → 1.1.0)

```bash
# Zmeň version v app.json
# "version": "1.1.0"

eas build --platform ios --profile testflight
eas submit --platform ios --profile testflight
```

### Variant 3: Major (1.0.0 → 2.0.0)

```bash
# Zmeň version v app.json
# "version": "2.0.0"
# "ios": { "buildNumber": "1" }

eas build --platform ios --profile testflight
eas submit --platform ios --profile testflight
```

**Pravidlo buildNumber:**
- Rovnaká `version` → autoincrement buildNumber
- Nová `version` → reset buildNumber na "1"

---

## Troubleshooting

### ❌ Build zlyhal

```bash
# Pozri detaily
eas build:list

# Skúsi znovu
eas build --platform ios --profile testflight --clear-cache
```

### ❌ Submit zlyhal

```bash
# Skontroluj credentials
eas credentials

# Manuálne submit
eas submit --platform ios --latest
```

### ❌ Processing trvá príliš dlho (>30 min)

1. App Store Connect → Activity
2. Ak vidíš error, oprav problém
3. Zbuilduj nanovo

### ❌ "Missing Compliance" v TestFlight

1. App Store Connect → TestFlight → build
2. **Provide Export Compliance Information**
3. Odpovedz **NO** (ak nepoužívaš encryption)
4. Submit

### ❌ Push notifikácie nefungujú

1. Developer portal → Certificates → Push Notification Certificate
2. Vygeneruj nový push cert
3. Nahraj do Supabase (Project Settings → Push Notifications)

---

## Checklist pred submissionom

- [ ] `app.json` má správny `version` a `buildNumber`
- [ ] `eas.json` má správne Apple ID, ASC App ID, Team ID
- [ ] ENV premenné sú nastavené (.env)
- [ ] Ikona a splash screen sú pripravené
- [ ] Typescript bez errorov (`pnpm typecheck`)
- [ ] ESLint bez warningov (`pnpm lint`)
- [ ] Aplikácia funguje na simulátore
- [ ] Push notifikácie sú nakonfigurované
- [ ] Privacy policy je dostupná (ak zbieraš dáta)

---

## Užitočné príkazy

```bash
# Zoznam buildov
eas build:list

# Detail konkrétneho buildu
eas build:view [BUILD_ID]

# Zoznam submissions
eas submit:list

# Credentials management
eas credentials

# Update EAS CLI
pnpm update -g eas-cli

# Vyčisti cache
eas build --clear-cache
```

---

## Dôležité linky

- **EAS Builds:** https://expo.dev/accounts/[username]/projects/finapp/builds
- **App Store Connect:** https://appstoreconnect.apple.com
- **Apple Developer:** https://developer.apple.com/account
- **EAS Documentation:** https://docs.expo.dev/build/introduction/
- **TestFlight Documentation:** https://developer.apple.com/testflight/

---

## Best Practices

### 1. Verziovanie
- **Patch** (1.0.X): Bugfixy, malé zmeny
- **Minor** (1.X.0): Nové featury, backward compatible
- **Major** (X.0.0): Breaking changes

### 2. Release Notes
Píš stručné, jasné release notes pre testerov:
```
✨ Nové funkcie:
- Dashboard s prehľadom financií
- Správa príjmov a výdavkov

🐛 Opravy:
- Opravené zmiznutie dát po reštarte
- Lepšie error handling

📝 Zmeny:
- Vylepšené UI
```

### 3. Testing
- Otestuj na reálnom zariadení pred submissionom
- Otestuj všetky kritické flows
- Skontroluj push notifikácie
- Skontroluj offline mode

### 4. Komunikácia s testermi
- Vytvor Slack/Discord channel pre feedback
- Reaguj na bug reporty do 24h
- Zbieraj feedback systematicky

---

**Pripravené! Môžeš začať s KROK 1 🚀**

