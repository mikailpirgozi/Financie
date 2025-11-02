# Dokončené opravy mobilnej aplikácie

## ✅ Opravené screens - Safe Area

Všetky screens majú teraz správne safe area pre iPhone notch:

1. **✅ incomes.tsx** - Príjmy
2. **✅ expenses.tsx** - Výdavky  
3. **✅ loans.tsx** - Úvery
4. **✅ settings.tsx** - Nastavenia
5. **✅ assets.tsx** - Majetok
6. **✅ categories.tsx** - Kategórie
7. **✅ summaries.tsx** - Súhrny
8. **✅ household.tsx** - Domácnosť

### Čo sa zmenilo:
- Pridaný `useSafeAreaInsets` hook do každého screenu
- Header padding sa prispôsobuje notch oblasti: `paddingTop: insets.top + 16`
- Text sa už neprekrýva s hornou oblasťou telefónu

## 🎯 Navigačný panel

### Riešenie:
1. **Vymazaná cache** - Expo cache a node_modules/.cache
2. **Reštartovaný server** - s `--clear` flagom
3. **`tabBarButton: () => null`** - nastavené pre skryté taby

### Hlavné taby (viditeľné):
- 📊 Dashboard
- 💰 Úvery
- 💸 Výdavky
- 💵 Príjmy
- ⋯ Viac

### Skryté taby (prístupné cez Settings → Ďalšie funkcie):
- 🏠 Majetok
- 🏷️ Kategórie
- 📈 Súhrny
- 👥 Domácnosť
- ⚡ Pravidlá
- 📝 Audit Log

## 🔧 Kroky pre užívateľa:

1. **Zatvorte Expo Go** úplne (swipe up z multitaskingu)
2. **Otvorte Expo Go znova**
3. **Načítajte aplikáciu** - QR kód alebo z histórie
4. **Vysledok:**
   - Spodný navigačný bar = **len 5 tabs**
   - Horné sekcie = **bez prekrývania textu**
   - Všetky data = **reálne čísla, nie NaN**

## 📝 Technické detaily

### Safe Area implementácia:
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Screen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
      ...
    </View>
  );
}
```

### Tab skrytie:
```typescript
<Tabs.Screen
  name="assets"
  options={{
    title: 'Majetok',
    tabBarButton: () => null,  // Skryje z tab baru
  }}
/>
```

## 🎉 Výsledok

- ✅ **Žiadne NaN hodnoty**
- ✅ **5 hlavných tabs** v navigačnom bare
- ✅ **Žiadne prekrývanie textu** na iPhone
- ✅ **Všetky funkcie dostupné** cez Settings
- ✅ **0 linter errors**

