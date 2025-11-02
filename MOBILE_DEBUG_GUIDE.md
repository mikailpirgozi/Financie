# 🔧 Návod na diagnostiku mobilnej aplikácie

## ✅ Vyriešené problémy

1. **Web server nebehal** - Teraz beží na porte 3000
2. **Pridané debug loggovanie** - Mobilná aplikácia teraz loguje všetky API volania
3. **Vytvorené pomocné scripty** - Pre overenie konfigurácie

## 📱 Ako spustiť mobilnú aplikáciu

### 1. Web server (už beží ✅)
```bash
cd apps/web
pnpm dev
```
Server beží na: http://localhost:3000

### 2. Mobilná aplikácia
```bash
cd apps/mobile
pnpm dev
```

### 3. Výber platformy
Po spustení Expo dev servera:
- **iOS Simulator**: Stlačte `i`
- **Android Emulator**: Stlačte `a`
- **Fyzické zariadenie**: Naskenujte QR kód v Expo Go aplikácii

## 🔍 Debug loggovanie

Mobilná aplikácia teraz loguje:

### API volania:
```
🌐 API Request: { url: '...', method: 'GET', hasAuth: true }
📡 API Response: { status: 200, ok: true }
✅ API Success: { dataKeys: [...] }
```

### Dashboard načítavanie:
```
🔄 Loading dashboard...
✅ Session found, user: email@example.com
🏠 Fetching current household...
✅ Household loaded: id, name
📊 Fetching dashboard data...
✅ Dashboard data loaded: { currentMonth: '...', historyLength: 6 }
```

### Chyby:
```
❌ Dashboard load error: [error message]
❌ API Fetch Error: { url: '...', error: '...', name: '...' }
```

## 🚨 Časté problémy a riešenia

### 1. "Network request failed" / "Failed to fetch"
**Príčina**: Mobilná aplikácia sa nemôže pripojiť k serveru

**Riešenie podľa platformy**:

#### iOS Simulator:
✅ Používa `localhost` - malo by fungovať
```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

#### Android Emulator:
❌ `localhost` nefunguje - použite špeciálnu IP adresu
```bash
# .env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

#### Fyzické zariadenie:
❌ `localhost` nefunguje - použite IP adresu vášho počítača

**Nájdite IP adresu**:
```bash
# macOS/Linux:
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows:
ipconfig
```

Potom upravte `.env`:
```bash
# .env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000  # Vaša IP adresa
```

⚠️ **Dôležité**: Po zmene `.env` súboru reštartujte Expo dev server!

### 2. "Unauthorized" (401)
**Príčina**: Neplatná autentifikácia

**Riešenie**:
1. Odhláste sa z aplikácie
2. Prihláste sa znova
3. Skontrolujte Supabase konfiguráciu v `.env`

### 3. "Household not found" (404)
**Príčina**: Užívateľ nie je členom žiadneho household

**Riešenie**:
1. Prihláste sa do web aplikácie (http://localhost:3000)
2. Vytvorte household
3. Vráťte sa do mobilnej aplikácie

### 4. Prázdny dashboard (žiadne dáta)
**Príčina**: Nie sú vytvorené žiadne dáta

**Riešenie**:
1. Pridajte demo dáta cez SQL:
```bash
psql [connection-string] < ADD_DEMO_DATA.sql
```

2. Alebo vytvorte dáta manuálne:
   - Úvery: Tab "Úvery"
   - Príjmy: Tab "Príjmy"
   - Výdavky: Tab "Výdavky"

## 🛠 Pomocné nástroje

### Kontrola konfigurácie:
```bash
cd apps/mobile
node check-env.js
```

### Test API pripojenia:
```bash
cd apps/mobile
node test-api.js
```

### Kontrola či beží web server:
```bash
lsof -i :3000
```

## 📊 Čo sledovať v logoch

Po prihlásení do mobilnej aplikácie by ste mali vidieť:

```
🔄 Loading dashboard...
✅ Session found, user: [váš email]
🏠 Fetching current household...
🌐 API Request: { url: 'http://localhost:3000/api/households/current', method: 'GET', hasAuth: true }
📡 API Response: { url: '...', status: 200, ok: true }
✅ API Success: { url: '...', dataKeys: ['household'] }
✅ Household loaded: [id], [name]
📊 Fetching dashboard data...
🌐 API Request: { url: 'http://localhost:3000/api/dashboard?householdId=[id]&monthsCount=6', method: 'GET', hasAuth: true }
📡 API Response: { url: '...', status: 200, ok: true }
✅ API Success: { url: '...', dataKeys: ['currentMonth', 'history'] }
✅ Dashboard data loaded: { currentMonth: '...', historyLength: 6 }
```

Ak vidíte **všetky tieto logy a dáta sa stále nezobrazujú**, pošlite mi screenshoty logov.

## 🧹 Cleanup

Po dokončení debugovania môžete vymazať pomocné súbory:
```bash
cd apps/mobile
rm check-env.js test-api.js
```

---

**Poznámka**: Debug loggovanie zostane v aplikácii. Ak chcete tiché logy, odstráňte `console.log` volania z:
- `apps/mobile/app/(tabs)/index.tsx`
- `apps/mobile/src/lib/api.ts`

