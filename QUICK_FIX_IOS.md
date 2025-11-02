# 🔧 Quick Fix pre iOS Simulator

## Problém: "Network request failed"

iOS Simulator má problém s `localhost` keď Next.js používa IPv6.

## ✅ Riešenie (už aplikované):

Server teraz beží s IPv4 binding:
```bash
cd apps/web
pnpm dev -H 0.0.0.0
```

## 📱 Kroky na obnovenie mobilnej aplikácie:

### 1. Hard reload aplikácie:
V termináli kde beží `pnpm dev`:
- Stlačte `r` - Reload
- Alebo `Shift+R` - Clear cache a reload

### 2. Ak stále nefunguje - použite 127.0.0.1:

Upravte `.env` súbor:
```bash
cd apps/mobile
# Zmeňte localhost na 127.0.0.1
EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
```

Potom:
1. Zastavte Expo server (Ctrl+C)
2. Spustite znova: `pnpm dev`
3. Reload aplikáciu

### 3. Posledné riešenie - IP adresa Mac-u:

```bash
# Zistite IP adresu:
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
```

Napríklad dostanete: `192.168.1.15`

Potom v `.env`:
```bash
EXPO_PUBLIC_API_URL=http://192.168.1.15:3000
```

## 🧪 Test server z terminálu:

```bash
# Test 1:
curl http://localhost:3000/api/households/current

# Test 2:
curl http://127.0.0.1:3000/api/households/current

# Obidva by mali vrátiť: {"error":"Unauthorized"}
# To znamená že server funguje!
```

## ⚡ Všetko v jednom príkaze:

```bash
# Zastavte všetko
pkill -f "next dev"
pkill -f "expo start"

# Spustite web server s IPv4
cd apps/web && pnpm dev -H 0.0.0.0 &

# Počkajte 10 sekúnd
sleep 10

# Spustite mobilnú aplikáciu
cd ../mobile && pnpm dev
```

---

**Server beží a je pripravený! Teraz len reload mobilnú aplikáciu.**

