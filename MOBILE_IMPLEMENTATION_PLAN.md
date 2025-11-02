# 📱 Mobilná Aplikácia - Komplexný Implementačný Plán

> **Dátum vytvorenia:** 2. november 2024  
> **Cieľ:** Dosiahnuť feature parity s webovou aplikáciou a zlepšiť UX/UI

---

## 🎯 Executive Summary

Mobilná aplikácia má **60-70% funkcionality** webovej verzie. Chybí hlavne:
- ⚠️ **KRITICKÉ:** Manuálne označovanie splátok v splátkovom kalendári
- ⚠️ **KRITICKÉ:** Upozornenia na splátky po splatnosti
- Subscription management (monetizácia)
- Pokročilé vizualizácie a charty
- Onboarding pre nových užívateľov
- Dokončené Settings screens

**Gap analýza:** ~30-40% missing features + UX improvements needed

---

## 🔴 CRITICAL PRIORITY (P0) - Okamžite riešiť

### 1. ✅ Manuálne Označovanie Splátok v Kalendári
**Status:** ❌ Chýba  
**Priorita:** P0 - CRITICAL  
**Časový odhad:** 3-5 dní

#### Problém
- Na **webe**: Užívateľ môže v splátkovom kalendári kliknúť na tlačidlo **"Označiť splátky ako uhradené k dnešnému dátumu"** alebo uhradiť individuálne splátky
- Na **mobile**: Kalendár splátok je read-only, nie je možné splátky označiť ako zaplatené
- **Impact:** Užívateľ nemôže sledovať zaplatené splátky → aplikácia je nepoužiteľná pre správu úverov

#### Web implementácia (ako to funguje)
```typescript
// Web: LoanDetailClient.tsx
const handleMarkPaidUntilToday = async () => {
  const today = new Date().toISOString().split('T')[0];
  const pendingUntilToday = schedule.filter(
    (entry) => (entry.status === 'pending' || entry.status === 'overdue') 
               && entry.due_date <= today
  );
  
  await fetch(`/api/loans/${loanId}/mark-paid-until-today`, {
    method: 'POST',
    body: JSON.stringify({ date: today }),
  });
};

// API endpoint: /api/loans/[id]/mark-paid-until-today
await supabase
  .from('loan_schedules')
  .update({ status: 'paid', paid_at: new Date().toISOString() })
  .eq('loan_id', loanId)
  .in('status', ['pending', 'overdue'])
  .lte('due_date', date);
```

#### Implementačný plán

**Krok 1: API funkcie v mobile lib** (1 deň)
```typescript
// apps/mobile/src/lib/api.ts

export async function markLoanInstallmentPaid(
  loanId: string, 
  installmentId: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${env.EXPO_PUBLIC_API_URL}/api/loans/${loanId}/pay`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ 
        installmentId,
        amount: 0 // Označenie ako paid bez payment entry
      }),
    }
  );
  
  if (!response.ok) throw new Error('Failed to mark installment as paid');
}

export async function markLoanPaidUntilToday(
  loanId: string,
  date: string
): Promise<{ success: boolean; count: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${env.EXPO_PUBLIC_API_URL}/api/loans/${loanId}/mark-paid-until-today`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ date }),
    }
  );
  
  if (!response.ok) throw new Error('Failed to mark installments');
  return response.json();
}
```

**Krok 2: Update loan schedule data structure** (0.5 dňa)
```typescript
// apps/mobile/app/(tabs)/loans/[id]/index.tsx

interface LoanScheduleEntry {
  id: string;
  loan_id: string;
  installment_no: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  fees_due: string;
  total_due: string;
  principal_balance_after: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at: string | null;
}

// Fetch schedule from loan_schedules table (nie loan_installments)
const { data: schedule } = await supabase
  .from('loan_schedules')
  .select('*')
  .eq('loan_id', id)
  .order('installment_no', { ascending: true });

// Označiť overdue položky
const today = new Date();
today.setHours(0, 0, 0, 0);

const scheduleWithStatus = schedule?.map((s) => {
  if (s.status === 'paid') return s;
  const dueDate = new Date(s.due_date);
  dueDate.setHours(0, 0, 0, 0);
  if (dueDate < today) {
    return { ...s, status: 'overdue' };
  }
  return s;
}) ?? [];
```

**Krok 3: UI pre individuálne splátky** (1 deň)
```typescript
// Pridať swipeable actions na každú splátku
import Swipeable from 'react-native-gesture-handler/Swipeable';

const renderInstallmentCard = (installment: LoanScheduleEntry) => {
  const rightActions = () => (
    <TouchableOpacity
      style={styles.markPaidAction}
      onPress={() => handleMarkInstallmentPaid(installment.id)}
    >
      <Text style={styles.actionIcon}>✓</Text>
      <Text style={styles.actionText}>Uhradiť</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable
      renderRightActions={installment.status !== 'paid' ? rightActions : undefined}
      overshootRight={false}
    >
      <Card style={styles.installmentCard}>
        <View style={styles.installmentHeader}>
          <View style={styles.installmentInfo}>
            <Text style={styles.installmentNumber}>
              Splátka #{installment.installment_no}
            </Text>
            <Text style={styles.installmentDate}>
              Splatnosť: {formatDate(installment.due_date)}
            </Text>
          </View>
          {getStatusBadge(installment.status)}
        </View>
        
        <View style={styles.installmentDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Istina</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(installment.principal_due)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Úrok</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(installment.interest_due)}
            </Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabelBold}>Celkom</Text>
            <Text style={styles.detailValueBold}>
              {formatCurrency(installment.total_due)}
            </Text>
          </View>
        </View>

        {/* Ak je overdue, zobraziť warning */}
        {installment.status === 'overdue' && (
          <View style={styles.overdueWarning}>
            <Text style={styles.overdueIcon}>⚠️</Text>
            <Text style={styles.overdueText}>Po splatnosti!</Text>
          </View>
        )}
      </Card>
    </Swipeable>
  );
};
```

**Krok 4: Bulk action - "Označiť všetko do dnes"** (1 deň)
```typescript
// Sticky button na vrchu zoznamu splátok
const handleMarkAllUntilToday = async () => {
  const today = new Date().toISOString().split('T')[0];
  
  const pendingCount = schedule.filter(
    (s) => (s.status === 'pending' || s.status === 'overdue') 
           && s.due_date <= today
  ).length;

  if (pendingCount === 0) {
    Alert.alert('Info', 'Žiadne splátky na označenie');
    return;
  }

  Alert.alert(
    'Potvrdiť úhradu',
    `Naozaj chcete označiť ${pendingCount} splátok ako uhradené?`,
    [
      { text: 'Zrušiť', style: 'cancel' },
      {
        text: 'Potvrdiť',
        onPress: async () => {
          try {
            await markLoanPaidUntilToday(loanId, today);
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            showToast(`${pendingCount} splátok označených!`, 'success');
            loadLoan(); // Refresh
          } catch (error) {
            await Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Error
            );
            showToast('Nepodarilo sa označiť splátky', 'error');
          }
        },
      },
    ]
  );
};

// UI
<View style={styles.bulkActions}>
  <Button
    onPress={handleMarkAllUntilToday}
    variant="primary"
    style={styles.bulkButton}
  >
    📅 Označiť splátky do dnes ako uhradené
  </Button>
</View>
```

**Krok 5: Optimistic updates** (0.5 dňa)
```typescript
// Okamžite update UI, potom fetch z DB
const [optimisticSchedule, setOptimisticSchedule] = useState(schedule);

const handleMarkInstallmentPaid = async (installmentId: string) => {
  // Optimistic update
  setOptimisticSchedule(prev =>
    prev.map(s =>
      s.id === installmentId
        ? { ...s, status: 'paid', paid_at: new Date().toISOString() }
        : s
    )
  );

  try {
    await markLoanInstallmentPaid(loanId, installmentId);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Splátka bola označená ako uhradená', 'success');
  } catch (error) {
    // Rollback on error
    setOptimisticSchedule(schedule);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    showToast('Nepodarilo sa označiť splátku', 'error');
  } finally {
    // Refresh data
    await loadLoan();
  }
};
```

**Súbory na úpravu:**
- ✏️ `apps/mobile/src/lib/api.ts` - pridať funkcie
- ✏️ `apps/mobile/app/(tabs)/loans/[id]/index.tsx` - update UI
- 📦 `pnpm add react-native-gesture-handler` (ak ešte nie je)

---

### 2. 🔔 Notifikácie na Splátky Po Splatnosti
**Status:** ❌ Chýba  
**Priorita:** P0 - CRITICAL  
**Časový odhad:** 2-3 dni

#### Problém
- Web zobrazuje červené alerty pri overdue splátkach na hlavnej stránke úveru
- Mobile nemá žiadne vizuálne upozornenia na omeškaté splátky
- Chýbajú push notifikácie

#### Implementačný plán

**Krok 1: Visual indicators na Dashboard** (0.5 dňa)
```typescript
// apps/mobile/app/(tabs)/index.tsx - Dashboard

// Spočítaj overdue splátky
const { data: overdueCount } = await supabase
  .rpc('count_overdue_installments', { p_household_id: household.id });

// Alert banner na dashboarde
{overdueCount > 0 && (
  <Card style={styles.alertCard}>
    <View style={styles.alertContent}>
      <Text style={styles.alertIcon}>⚠️</Text>
      <View style={styles.alertText}>
        <Text style={styles.alertTitle}>
          Máte {overdueCount} {overdueCount === 1 ? 'omeškanú splátku' : 'omeškané splátky'}
        </Text>
        <Text style={styles.alertSubtitle}>
          Kliknite pre zobrazenie
        </Text>
      </View>
    </View>
    <TouchableOpacity
      style={styles.alertButton}
      onPress={() => router.push('/(tabs)/loans')}
    >
      <Text style={styles.alertButtonText}>Zobraziť</Text>
    </TouchableOpacity>
  </Card>
)}
```

**Krok 2: Badge na Loans tab** (0.5 dňa)
```typescript
// apps/mobile/app/(tabs)/_layout.tsx

// Fetch overdue count real-time
const [overdueCount, setOverdueCount] = useState(0);

useEffect(() => {
  const fetchOverdueCount = async () => {
    // ... fetch z API
  };
  
  fetchOverdueCount();
  
  // Realtime subscription
  const channel = supabase
    .channel('overdue-badges')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'loan_schedules' },
      fetchOverdueCount
    )
    .subscribe();
    
  return () => { supabase.removeChannel(channel); };
}, []);

// Update tab icon
<Tabs.Screen
  name="loans"
  options={{
    title: 'Úvery',
    tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>💰</Text>,
    tabBarBadge: overdueCount > 0 ? overdueCount : undefined,
  }}
/>
```

**Krok 3: Push notifikácie (Expo Notifications)** (1-2 dni)
```typescript
// apps/mobile/src/lib/notifications.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Konfigurácia
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Registrácia push tokenu
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    Alert.alert('Chyba', 'Povolte notifikácie v nastaveniach');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  
  // Ulož token do DB
  await savePushToken(token);
  
  return token;
}

// Scheduled local notifications pre splátky
export async function scheduleLoanReminders(
  loans: Loan[],
  schedules: LoanScheduleEntry[]
) {
  // Cancel existing
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  const today = new Date();
  
  for (const entry of schedules) {
    if (entry.status === 'paid') continue;
    
    const dueDate = new Date(entry.due_date);
    const daysUntil = Math.ceil(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Notifikácia 3 dni pred splatnosťou
    if (daysUntil === 3) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Pripomienka splátky',
          body: `O 3 dni je splatná splátka vo výške ${formatCurrency(entry.total_due)}`,
          data: { loanId: entry.loan_id, installmentId: entry.id },
        },
        trigger: {
          date: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000),
          hour: 9,
          minute: 0,
        },
      });
    }
    
    // Notifikácia v deň splatnosti
    if (daysUntil === 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Dnes je splatnosť!',
          body: `Dnes by ste mali zaplatiť splátku ${formatCurrency(entry.total_due)}`,
          data: { loanId: entry.loan_id, installmentId: entry.id },
        },
        trigger: { date: dueDate, hour: 9, minute: 0 },
      });
    }
    
    // Notifikácia po splatnosti
    if (daysUntil < 0 && entry.status === 'overdue') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Splátka po splatnosti!',
          body: `Splátka ${formatCurrency(entry.total_due)} je ${Math.abs(daysUntil)} dní po splatnosti`,
          data: { loanId: entry.loan_id, installmentId: entry.id },
        },
        trigger: null, // Immediate
      });
    }
  }
}
```

**Krok 4: Handling notification taps** (0.5 dňa)
```typescript
// apps/mobile/app/_layout.tsx

useEffect(() => {
  // Response to notification tap
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      if (data.loanId) {
        router.push(`/(tabs)/loans/${data.loanId}`);
      }
    }
  );

  return () => subscription.remove();
}, []);
```

**Krok 5: Background job (Edge Function)** (1 deň)
```typescript
// supabase/functions/loan-due-reminder/index.ts
// Už existuje! Len treba aktivovať cron job

// 1. Aktivovať v Supabase Dashboard → Edge Functions → Cron Jobs
// 2. Schedule: "0 9 * * *" (každý deň o 9:00)

// Funkcia už implementovaná, odošle push notifikácie na všetky due loans
```

**Súbory na úpravu/vytvorenie:**
- ✏️ `apps/mobile/app/(tabs)/index.tsx` - alert banner
- ✏️ `apps/mobile/app/(tabs)/_layout.tsx` - badge
- 🆕 `apps/mobile/src/lib/notifications.ts` - notification logic
- ✏️ `apps/mobile/app/_layout.tsx` - notification handlers
- ⚙️ Aktivovať cron job v Supabase

**Dependencies:**
```bash
pnpm add expo-notifications expo-device
```

---

## 🔴 HIGH PRIORITY (P1) - 1-2 týždne

### 3. 📊 Advanced Charts & Vizualizácie
**Časový odhad:** 3-4 dni

#### Súčasný stav
- Mobile má len 2 basic charts (line + pie)
- Web má 4 interaktívne taby s Recharts

#### Riešenie
```bash
pnpm add react-native-chart-kit react-native-svg
# alebo
pnpm add victory-native
```

**Implementácia s Victory Native:**
```typescript
// apps/mobile/components/charts/InteractiveCharts.tsx

import { VictoryChart, VictoryLine, VictoryBar, VictoryArea, VictoryTooltip } from 'victory-native';

export function FinancialCharts({ data }: { data: MonthlyDashboardData[] }) {
  const [selectedTab, setSelectedTab] = useState<'income-expenses' | 'net-worth' | 'loans' | 'growth'>('income-expenses');

  return (
    <Card>
      <View style={styles.tabs}>
        <TouchableOpacity onPress={() => setSelectedTab('income-expenses')}>
          <Text>Príjmy vs Výdaje</Text>
        </TouchableOpacity>
        {/* ... ďalšie taby */}
      </View>

      {selectedTab === 'income-expenses' && (
        <VictoryChart>
          <VictoryBar
            data={data}
            x="month"
            y="income"
            style={{ data: { fill: '#10b981' } }}
            labels={({ datum }) => `€${datum.income}`}
            labelComponent={<VictoryTooltip />}
          />
          <VictoryBar
            data={data}
            x="month"
            y="expenses"
            style={{ data: { fill: '#ef4444' } }}
          />
        </VictoryChart>
      )}

      {/* ... ďalšie charty */}
    </Card>
  );
}
```

**Súbory:**
- 🆕 `apps/mobile/components/charts/InteractiveCharts.tsx`
- ✏️ `apps/mobile/app/(tabs)/index.tsx` - použiť nový chart komponent

---

### 4. 💎 Subscription Management
**Časový odhad:** 4-5 dní

#### Implementácia s RevenueCat
```bash
pnpm add react-native-purchases
```

**Setup:**
```typescript
// apps/mobile/src/lib/subscriptions.ts

import Purchases from 'react-native-purchases';

export async function initializeSubscriptions() {
  if (Platform.OS === 'ios') {
    await Purchases.configure({ apiKey: env.REVENUECAT_IOS_KEY });
  } else if (Platform.OS === 'android') {
    await Purchases.configure({ apiKey: env.REVENUECAT_ANDROID_KEY });
  }
}

export async function getSubscriptionOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export async function purchasePackage(pkg: PurchasesPackage) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}
```

**UI:**
```typescript
// apps/mobile/app/(tabs)/settings/subscription.tsx

export default function SubscriptionScreen() {
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  // ... fetch offerings & current plan

  return (
    <ScrollView>
      <Card style={styles.currentPlanCard}>
        <Text style={styles.title}>Súčasný plán</Text>
        <Text style={styles.plan}>{currentPlan}</Text>
      </Card>

      <View style={styles.pricingCards}>
        {offerings?.availablePackages.map((pkg) => (
          <Card key={pkg.identifier} style={styles.pricingCard}>
            <Text style={styles.packageTitle}>{pkg.product.title}</Text>
            <Text style={styles.packagePrice}>
              {pkg.product.priceString} / {pkg.packageType}
            </Text>
            <Button onPress={() => handlePurchase(pkg)}>
              Upgrade
            </Button>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
```

**Súbory:**
- 🆕 `apps/mobile/src/lib/subscriptions.ts`
- 🆕 `apps/mobile/app/(tabs)/settings/subscription.tsx`
- ✏️ `apps/mobile/app/_layout.tsx` - init subscriptions
- ✏️ `apps/mobile/app/(tabs)/settings.tsx` - link na subscription

---

### 5. 🎯 Onboarding Flow
**Časový odhad:** 2-3 dni

```typescript
// apps/mobile/app/onboarding/welcome.tsx

export default function WelcomeScreen() {
  return (
    <Swiper loop={false} showsPagination>
      <View style={styles.slide}>
        <Text style={styles.icon}>💰</Text>
        <Text style={styles.title}>Vitajte v Financie App</Text>
        <Text style={styles.text}>
          Sledujte svoje úvery, výdavky a príjmy na jednom mieste
        </Text>
      </View>

      <View style={styles.slide}>
        <Text style={styles.icon}>📊</Text>
        <Text style={styles.title}>Vizualizujte svoje financie</Text>
        <Text style={styles.text}>
          Pokročilé grafy a reporty vám pomôžu robiť lepšie rozhodnutia
        </Text>
      </View>

      <View style={styles.slide}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.title}>Notifikácie na splátky</Text>
        <Text style={styles.text}>
          Nikdy nezmeškajte dôležitú splátku
        </Text>
        <Button onPress={handleFinish}>Začať</Button>
      </View>
    </Swiper>
  );
}
```

**Súbory:**
- 🆕 `apps/mobile/app/onboarding/` - celý flow
- Dependencies: `pnpm add react-native-swiper`

---

### 6. 🎨 Icon Upgrade (Emoji → Vector Icons)
**Časový odhad:** 1 deň

```bash
pnpm add @expo/vector-icons
# alebo
pnpm add lucide-react-native
```

**Before:**
```typescript
tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📊</Text>
```

**After:**
```typescript
import { TrendingUp, Wallet, CreditCard, DollarSign, MoreHorizontal } from 'lucide-react-native';

tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />
```

**Súbory:**
- ✏️ `apps/mobile/app/(tabs)/_layout.tsx`
- ✏️ Všetky komponenty s emoji ikonami

---

## 🟡 MEDIUM PRIORITY (P2) - 2-3 týždne

### 7. ⚙️ Dokončiť Settings Screens
**Časový odhad:** 3-4 dni

Súčasne sú prázdne:
- `/(tabs)/settings/profile.tsx` - edit profilu
- `/(tabs)/settings/notifications.tsx` - notification settings
- `/(tabs)/settings/language.tsx` - jazyk switcher
- `/(tabs)/settings/about.tsx` - info o app
- `/(tabs)/settings/help.tsx` - FAQ
- `/(tabs)/settings/privacy.tsx` - privacy policy

**Implementovať každý screen s reálnou funkcionalitou.**

---

### 8. 🤖 Rules Management UI
**Časový odhad:** 2-3 dni

Web má kompletný `RulesManager` - mobile potrebuje:
- Zoznam pravidiel
- Pridať nové pravidlo
- Upraviť/Zmazať

---

### 9. 💡 Income Templates Quick Dialog
**Časový odhad:** 1-2 dni

Web má quick add dialog - mobile má len celý screen.

---

### 10. 🌓 Theme Toggle (Dark Mode)
**Časový odhad:** 2-3 dni

Web má dark/light mode - mobile len light.

```typescript
import { useColorScheme } from 'react-native';

const scheme = useColorScheme();
const theme = scheme === 'dark' ? darkTheme : lightTheme;
```

---

## 🟢 LOW PRIORITY (P3) - Nice to have

### 11. 🐛 Debug Screen
**Časový odhad:** 1 deň

Pre troubleshooting v produkcii.

---

### 12. 🛡️ Error Boundary
**Časový odhad:** 0.5 dňa

Catch React errors a zobraz friendly message.

---

### 13. 🎭 Animations & Micro-interactions
**Časový odhad:** 3-5 dní

- Reanimated 2
- Lottie animácie
- Smooth transitions

---

### 14. 👆 Gesture Controls
**Časový odhad:** 2-3 dni

- Swipe to delete
- Pull to refresh (už máte)
- Long press actions

---

## 📅 Časový Harmonogram

### Sprint 1 (Týždeň 1-2): CRITICAL
- ✅ Manuálne označovanie splátok (3-5 dní)
- 🔔 Notifikácie na splátky (2-3 dní)
- **Total: 5-8 dní**

### Sprint 2 (Týždeň 3-4): HIGH PRIORITY
- 📊 Advanced charts (3-4 dní)
- 💎 Subscription (4-5 dní)
- **Total: 7-9 dní**

### Sprint 3 (Týždeň 5-6): HIGH PRIORITY
- 🎯 Onboarding (2-3 dní)
- 🎨 Icon upgrade (1 deň)
- ⚙️ Settings screens začať (2 dni)
- **Total: 5-6 dní**

### Sprint 4+ (Týždeň 7-8+): MEDIUM/LOW
- Zvyšok features podľa kapacity

**Celkový odhad pre full parity:** 6-10 týždňov (1 developer full-time)

---

## 🎯 Definition of Done

### Pre každú feature:
- ✅ Implementované na iOS
- ✅ Implementované na Android
- ✅ TypeScript strict mode (no any)
- ✅ Zero errors/warnings
- ✅ Tested na fyzickom zariadení
- ✅ Haptic feedback tam kde má zmysel
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications
- ✅ Pull-to-refresh
- ✅ Offline mode handling (graceful degradation)

---

## 🛠️ Technické Požiadavky

### Dependencies to install:
```bash
# Charts
pnpm add victory-native react-native-svg

# Icons
pnpm add lucide-react-native

# Notifications
pnpm add expo-notifications expo-device

# Subscriptions
pnpm add react-native-purchases

# Onboarding
pnpm add react-native-swiper

# Gestures (už možno máte)
pnpm add react-native-gesture-handler react-native-reanimated
```

### Environment Variables:
```env
# .env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=...
```

---

## 📊 Metriky Úspechu

### KPIs pre implementáciu:
- **Feature Parity:** 100% (momentálne 60-70%)
- **User Satisfaction:** 4.5+ stars
- **Crash-free Rate:** 99.5%+
- **App Store Review:** < 3 dni approval
- **Performance:** 60 FPS na všetkých screens
- **Bundle Size:** < 50MB

---

## 🚀 Quick Wins (môžete urobiť hneď dnes)

1. **Emoji → Lucide icons** (1-2 hodiny)
2. **Overdue badge na Loans tab** (30 min)
3. **Alert banner na Dashboard** (1 hodina)
4. **Pull-to-refresh everywhere** (už máte, skontrolovať všade)

---

## ❓ Otvorené Otázky

1. **Push notifications:** Expo Push Notifications alebo Firebase Cloud Messaging?
2. **Subscriptions:** RevenueCat alebo priamo Stripe?
3. **Charts:** Victory Native alebo React Native Chart Kit?
4. **Design system:** Vytvoriť vlastný alebo použiť existujúci (NativeBase, Tamagui)?
5. **Testing:** Chcete E2E testy (Detox/Maestro)?

---

## 📞 Next Steps

1. **Review tohto plánu** - potvrdenie priorít
2. **Sprint Planning** - rozdelenie úloh
3. **Kick-off Sprint 1** - začať s CRITICAL features
4. **Daily standups** - tracking progress
5. **Demo po každom sprinte**

---

**Poznámky:**
- Všetky odhady sú pre 1 full-time developer
- Pri pair programmingu môžete čas skrátiť o 20-30%
- Kritické features (splátky + notifikácie) by mali byť hotové do 2 týždňov MAX
- Subscription môže počkať, ale je to key monetization feature

**Pripravil:** AI Assistant  
**Dátum:** 2.11.2024  
**Verzia:** 1.0

