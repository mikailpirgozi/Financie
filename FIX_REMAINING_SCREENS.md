# Opravy pre zvyšné screens - Safe Area

Pridať do všetkých týchto screens:

## 1. Import
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

## 2. Hook v component
```typescript
const insets = useSafeAreaInsets();
```

## 3. Aplikovať na header
```typescript
<View style={[styles.header, { paddingTop: insets.top + 16 }]}>
```

## Súbory na opravu:
- ✅ incomes.tsx - HOTOVO
- ✅ expenses.tsx - HOTOVO  
- ✅ loans.tsx - HOTOVO
- ✅ settings.tsx - HOTOVO
- ⏳ assets.tsx
- ⏳ categories.tsx
- ⏳ summaries.tsx
- ⏳ household.tsx

## Navigačný panel
- Reštartovaný Expo s vymazanou cache
- Nastavené `tabBarButton: () => null` pre skryté taby
- Čakáme na reload aplikácie

