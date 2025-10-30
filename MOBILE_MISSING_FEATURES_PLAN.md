# Mobile App - Missing Features Implementation Plan

**Created:** 2025-10-30  
**Status:** 🟢 IN PROGRESS - Phase 1 & 2 COMPLETE, Phase 3 ready  
**Estimated Total Time:** 5-6 pracovných dní

## ✅ IMPLEMENTATION PROGRESS

### Completed:
- ✅ **PHASE 1.1** - Assets Tab v Navigation (15 min) - DONE
- ✅ **PHASE 1.2** - Rules Management Screen (0.5 dňa) - DONE  
  - `apps/mobile/app/(tabs)/rules.tsx` - list screen
  - `apps/mobile/app/(tabs)/rules/new.tsx` - create screen
  - `apps/mobile/app/(tabs)/rules/[id]/edit.tsx` - edit screen
  - API functions in `api.ts`
- ✅ **PHASE 1.3** - Audit Log Screen (0.5 dňa) - DONE
  - `apps/mobile/app/(tabs)/audit.tsx` - DONE
  - API functions in `api.ts`
- ✅ **PHASE 2.1** - Category Create/Edit Screens (0.5 dňa) - DONE
  - `apps/mobile/app/(tabs)/categories/new.tsx` - DONE
  - `apps/mobile/app/(tabs)/categories/[id]/edit.tsx` - DONE
  - API functions in `api.ts`
- ✅ **PHASE 2.2** - Household Invite/Settings screens (0.5 dňa) - DONE
  - `apps/mobile/app/(tabs)/household/invite.tsx` - DONE
  - `apps/mobile/app/(tabs)/household/settings.tsx` - DONE
- ✅ **PHASE 2.3** - Settings Sub-screens (1 deň) - DONE
  - `apps/mobile/app/(tabs)/settings/profile.tsx` - DONE
  - `apps/mobile/app/(tabs)/settings/notifications.tsx` - DONE
  - `apps/mobile/app/(tabs)/settings/language.tsx` - DONE
  - `apps/mobile/app/(tabs)/settings/about.tsx` - DONE
  - `apps/mobile/app/(tabs)/settings/help.tsx` - DONE
  - `apps/mobile/app/(tabs)/settings/privacy.tsx` - DONE

### In Progress:
- 🔄 **PHASE 3** - Medium Priority Features (ready to start)

### Remaining:
- ⏳ PHASE 3.1 - Loan Early Repayment
- ⏳ PHASE 3.2 - Subscription Management  
- ⏳ PHASE 3.3 - Loan Simulate Scenarios

---

## Executive Summary

Na základe analýzy web a mobilnej aplikácie boli identifikované **chýbajúce features** potrebné pre dosiahnutie **feature parity**. Tento plán pokrýva implementáciu všetkých critical a high-priority features.

### Prioritizácia

- 🔴 **CRITICAL** - Core funkcionality bez ktorých aplikácia nie je kompletná
- 🟠 **HIGH** - Dôležité features pre plnú funkcionalitu
- 🟡 **MEDIUM** - Nice-to-have features zlepšujúce UX
- 🟢 **LOW** - Optional enhancements

---

## PHASE 1: Critical Features (1.5 dňa)

### 🔴 1.1 Assets Tab v Navigation (15 min)

**Problém:** Assets CRUD je kompletne implementovaný, ale chýba v bottom tab navigation.

**Súbor:** `apps/mobile/app/(tabs)/_layout.tsx`

**Kroky:**
1. Pridať Assets tab medzi Loans a Expenses
2. Icon: 🏠 alebo 🏦
3. Title: "Majetok"
4. Route: `assets`

**Implementácia:**
```typescript
<Tabs.Screen
  name="assets"
  options={{
    title: 'Majetok',
    tabBarIcon: () => '🏠',
  }}
/>
```

**Acceptance Criteria:**
- ✅ Assets tab viditeľný v bottom navigation
- ✅ Navigácia na Assets screen funguje
- ✅ Icon a title správne zobrazené

---

### 🔴 1.2 Rules Management Screen (0.5 dňa)

**Problém:** Kompletne chýba Rules screen pre automatickú kategorizáciu.

**Web referencia:** 
- `/api/rules` (GET, POST)
- `/dashboard/rules` - RulesManager component
- Match types: contains, exact, starts_with, ends_with

**Súbory na vytvorenie:**
```
apps/mobile/app/(tabs)/rules.tsx
apps/mobile/app/(tabs)/rules/new.tsx
apps/mobile/app/(tabs)/rules/[id]/edit.tsx
```

**API Integration:**
```typescript
// apps/mobile/src/lib/api.ts

export interface Rule {
  id: string;
  household_id: string;
  match_type: 'contains' | 'exact' | 'starts_with' | 'ends_with';
  match_value: string;
  target_category_id: string;
  applies_to: 'expense' | 'income';
  created_at: string;
}

export async function getRules(householdId: string): Promise<Rule[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(
    `${env.EXPO_PUBLIC_API_URL}/api/rules?householdId=${householdId}`,
    {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
    }
  );
  if (!response.ok) throw new Error('Failed to fetch rules');
  return response.json();
}

export async function createRule(data: Omit<Rule, 'id' | 'created_at'>): Promise<Rule> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/rules`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create rule');
  return response.json();
}

export async function deleteRule(ruleId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/rules/${ruleId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session?.access_token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete rule');
}
```

**UI Components:**

**RulesScreen (apps/mobile/app/(tabs)/rules.tsx):**
- FlatList s rule cards
- Match type badge (contains/exact/...)
- Target category display
- Applies to badge (expense/income)
- Swipe actions: edit, delete
- Empty state s CTA "Vytvoriť prvé pravidlo"
- Pull-to-refresh

**NewRuleScreen (apps/mobile/app/(tabs)/rules/new.tsx):**
- Match type Select (contains, exact, starts_with, ends_with)
- Match value Input
- Applies to Radio (expense/income)
- Target category CategoryPicker
- Save button

**Layout Structure:**
```tsx
<Card>
  <View style={styles.ruleHeader}>
    <Badge variant={matchTypeBadge}>{rule.match_type}</Badge>
    <Badge variant={appliesTo === 'expense' ? 'error' : 'success'}>
      {appliesTo === 'expense' ? '💸 Výdavok' : '💰 Príjem'}
    </Badge>
  </View>
  <Text style={styles.matchValue}>{rule.match_value}</Text>
  <View style={styles.arrow}>→</View>
  <Text style={styles.categoryName}>{category?.name}</Text>
</Card>
```

**Validation Schema (použiť z @finapp/core):**
```typescript
import { z } from 'zod';

const createRuleSchema = z.object({
  match_type: z.enum(['contains', 'exact', 'starts_with', 'ends_with']),
  match_value: z.string().min(1, 'Match value is required'),
  target_category_id: z.string().uuid(),
  applies_to: z.enum(['expense', 'income']),
  household_id: z.string().uuid(),
});
```

**Pridať do navigation:**
```typescript
// apps/mobile/app/(tabs)/_layout.tsx
<Tabs.Screen
  name="rules"
  options={{
    title: 'Pravidlá',
    tabBarIcon: () => '⚡',
  }}
/>
```

**Acceptance Criteria:**
- ✅ Rules screen zobrazuje všetky pravidlá
- ✅ Create rule form funguje
- ✅ Delete rule funguje
- ✅ Empty state zobrazený ak nie sú pravidlá
- ✅ Swipe actions funkčné
- ✅ Match type a applies to badges správne zobrazené

---

### 🔴 1.3 Audit Log Screen (0.5 dňa)

**Problém:** Audit screen je v pláne, ale nie je implementovaný.

**Web referencia:**
- `/api/audit` (GET s filters)
- `/dashboard/audit` - tabuľka s changeset diff

**Súbor na vytvorenie:**
```
apps/mobile/app/(tabs)/audit.tsx
```

**API Integration:**
```typescript
// apps/mobile/src/lib/api.ts

export interface AuditLogEntry {
  id: string;
  user_id: string;
  household_id: string;
  action: 'create' | 'update' | 'delete';
  entity_type: 'expense' | 'income' | 'loan' | 'asset' | 'category';
  entity_id: string;
  changes: Record<string, any>;
  timestamp: string;
  user?: {
    email: string;
    full_name: string | null;
  };
}

export async function getAuditLog(
  householdId: string,
  filters?: {
    entityType?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<AuditLogEntry[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const params = new URLSearchParams({
    householdId,
    ...filters,
  });
  
  const response = await fetch(
    `${env.EXPO_PUBLIC_API_URL}/api/audit?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
      },
    }
  );
  
  if (!response.ok) throw new Error('Failed to fetch audit log');
  const data = await response.json();
  return data.entries || [];
}
```

**UI Components:**

**AuditScreen (apps/mobile/app/(tabs)/audit.tsx):**
- FlatList chronologicky (najnovšie hore)
- Filter buttons (All, Create, Update, Delete)
- Entity type filter (All, Expense, Income, Loan, Asset)
- Card per entry s:
  - Action badge (color-coded)
  - Entity type icon
  - User info
  - Timestamp (relative time)
  - Tap to expand changes diff
- Pull-to-refresh
- Infinite scroll pagination

**Audit Entry Card:**
```tsx
<Card style={styles.auditCard}>
  <View style={styles.header}>
    <Badge variant={getActionVariant(entry.action)}>
      {entry.action.toUpperCase()}
    </Badge>
    <Text style={styles.entityType}>
      {getEntityIcon(entry.entity_type)} {entry.entity_type}
    </Text>
  </View>
  
  <View style={styles.userInfo}>
    <Text style={styles.userName}>
      {entry.user?.full_name || entry.user?.email}
    </Text>
    <Text style={styles.timestamp}>
      {formatRelativeTime(entry.timestamp)}
    </Text>
  </View>
  
  {expanded && (
    <View style={styles.changes}>
      {Object.entries(entry.changes).map(([key, value]) => (
        <View key={key} style={styles.changeRow}>
          <Text style={styles.changeKey}>{key}:</Text>
          <Text style={styles.changeValue}>{JSON.stringify(value)}</Text>
        </View>
      ))}
    </View>
  )}
</Card>
```

**Helper functions:**
```typescript
const getActionVariant = (action: string) => {
  switch (action) {
    case 'create': return 'success';
    case 'update': return 'warning';
    case 'delete': return 'error';
    default: return 'default';
  }
};

const getEntityIcon = (entityType: string) => {
  const icons = {
    expense: '💸',
    income: '💰',
    loan: '🏦',
    asset: '🏠',
    category: '🏷️',
  };
  return icons[entityType] || '📄';
};

const formatRelativeTime = (timestamp: string) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = now.getTime() - then.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Práve teraz';
  if (minutes < 60) return `Pred ${minutes} min`;
  if (hours < 24) return `Pred ${hours} h`;
  return `Pred ${days} dňami`;
};
```

**Pridať do navigation:**
```typescript
// apps/mobile/app/(tabs)/_layout.tsx
<Tabs.Screen
  name="audit"
  options={{
    title: 'Audit Log',
    tabBarIcon: () => '📝',
  }}
/>
```

**Acceptance Criteria:**
- ✅ Audit log zobrazuje všetky zmeny chronologicky
- ✅ Filters fungujú (action, entity type)
- ✅ Entry cards správne zobrazené
- ✅ Changes diff expandable
- ✅ Relative time formatting
- ✅ Pull-to-refresh funguje
- ✅ Empty state ak nie sú záznamy

---

## PHASE 2: High Priority Features (2 dni)

### 🟠 2.1 Category Create/Edit Screens (0.5 dňa)

**Problém:** Categories.tsx má swipe actions s edit linkom, ale screeny neexistujú.

**Súbory na vytvorenie:**
```
apps/mobile/app/(tabs)/categories/new.tsx
apps/mobile/app/(tabs)/categories/[id]/edit.tsx
apps/mobile/app/(tabs)/categories/[id]/index.tsx (optional - detail view)
```

**API už existuje:**
- POST `/api/categories`
- PUT `/api/categories/[id]`
- DELETE `/api/categories/[id]` (už implementovaný)

**NewCategoryScreen (apps/mobile/app/(tabs)/categories/new.tsx):**
```tsx
interface CategoryFormData {
  name: string;
  kind: 'expense' | 'income' | 'asset' | 'loan';
  parent_id?: string;
  household_id: string;
}

export default function NewCategoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      kind: 'expense',
    },
  });

  // Load categories for parent picker
  useEffect(() => {
    loadCategories();
  }, [form.watch('kind')]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setLoading(true);
      const household = await getCurrentHousehold();
      await createCategory({ ...data, household_id: household.id });
      
      showToast('Kategória bola vytvorená', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      showToast('Nepodarilo sa vytvoriť kategóriu', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Nová kategória</Text>
      </View>

      <View style={styles.form}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormInput
              label="Názov kategórie"
              placeholder="napr. Potraviny"
              {...field}
            />
          )}
        />

        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormSelect
              label="Typ kategórie"
              options={[
                { label: '💸 Výdavok', value: 'expense' },
                { label: '💰 Príjem', value: 'income' },
                { label: '🏠 Majetok', value: 'asset' },
                { label: '🏦 Úver', value: 'loan' },
              ]}
              {...field}
            />
          )}
        />

        <FormField
          control={form.control}
          name="parent_id"
          render={({ field }) => (
            <FormSelect
              label="Nadradená kategória (voliteľné)"
              options={[
                { label: 'Žiadna', value: '' },
                ...categories
                  .filter(c => c.kind === form.watch('kind'))
                  .map(c => ({ label: c.name, value: c.id }))
              ]}
              {...field}
            />
          )}
        />
      </View>

      <View style={styles.actions}>
        <Button
          onPress={form.handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          fullWidth
        >
          Vytvoriť kategóriu
        </Button>
        <Button
          onPress={() => router.back()}
          variant="outline"
          fullWidth
        >
          Zrušiť
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

**EditCategoryScreen (apps/mobile/app/(tabs)/categories/[id]/edit.tsx):**
- Rovnaký form ako create
- Pre-filled s existujúcimi údajmi
- Delete button (už existuje v categories.tsx swipe action)

**API functions:**
```typescript
// apps/mobile/src/lib/api.ts

export async function createCategory(data: {
  name: string;
  kind: string;
  parent_id?: string;
  household_id: string;
}): Promise<Category> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create category');
  const result = await response.json();
  return result.category;
}

export async function updateCategory(
  id: string,
  data: Partial<Category>
): Promise<Category> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(
    `${env.EXPO_PUBLIC_API_URL}/api/categories/${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error('Failed to update category');
  const result = await response.json();
  return result.category;
}
```

**Acceptance Criteria:**
- ✅ New category screen funguje
- ✅ Edit category screen funguje
- ✅ Parent category picker zobrazuje len kategórie rovnakého typu
- ✅ Validation funguje (name required, kind required)
- ✅ Success/error toasts zobrazené
- ✅ Navigation back po úspechu

---

### 🟠 2.2 Household Invite/Settings Screens (0.5 dňa)

**Problém:** Household.tsx má buttony pre invite a settings, ale screeny neexistujú.

**Súbory na vytvorenie:**
```
apps/mobile/app/(tabs)/household/invite.tsx
apps/mobile/app/(tabs)/household/settings.tsx
```

**Web referencia:**
- POST `/api/household/invite`
- GET/DELETE `/api/household/members/[id]`

**InviteScreen (apps/mobile/app/(tabs)/household/invite.tsx):**
```tsx
interface InviteFormData {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export default function InviteScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      role: 'member',
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    try {
      setLoading(true);
      const household = await getCurrentHousehold();
      
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/household/invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            household_id: household.id,
            email: data.email,
            role: data.role,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to send invitation');

      showToast('Pozvánka bola odoslaná', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      showToast('Nepodarilo sa odoslať pozvánku', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Pozvať člena</Text>
        <Text style={styles.subtitle}>
          Pridajte nového člena do domácnosti
        </Text>
      </View>

      <View style={styles.form}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormInput
              label="Email adresa"
              placeholder="jan.novak@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              {...field}
            />
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormSelect
              label="Rola"
              options={[
                { label: '👑 Administrátor', value: 'admin' },
                { label: '👤 Člen', value: 'member' },
                { label: '👁️ Pozorovateľ', value: 'viewer' },
              ]}
              {...field}
            />
          )}
        />

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Práva rolí:</Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>Administrátor:</Text> Plný prístup, môže upravovať nastavenia
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>Člen:</Text> Môže pridávať a upravovať záznamy
          </Text>
          <Text style={styles.infoText}>
            • <Text style={styles.bold}>Pozorovateľ:</Text> Len čítací prístup
          </Text>
        </Card>
      </View>

      <View style={styles.actions}>
        <Button
          onPress={form.handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          fullWidth
        >
          Odoslať pozvánku
        </Button>
        <Button
          onPress={() => router.back()}
          variant="outline"
          fullWidth
        >
          Zrušiť
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

**HouseholdSettingsScreen (apps/mobile/app/(tabs)/household/settings.tsx):**
```tsx
export default function HouseholdSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadHousehold();
  }, []);

  const loadHousehold = async () => {
    try {
      const data = await getCurrentHousehold();
      setHousehold(data);
      
      // Check if current user is admin
      const { data: { user } } = await supabase.auth.getUser();
      const { data: membership } = await supabase
        .from('household_members')
        .select('role')
        .eq('household_id', data.id)
        .eq('user_id', user?.id)
        .single();
      
      setIsAdmin(membership?.role === 'admin');
    } catch (error) {
      console.error('Failed to load household:', error);
    }
  };

  const handleUpdateName = async (newName: string) => {
    if (!household || !isAdmin) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('households')
        .update({ name: newName })
        .eq('id', household.id);

      if (error) throw error;

      showToast('Názov domácnosti bol aktualizovaný', 'success');
      await loadHousehold();
    } catch (error) {
      showToast('Nepodarilo sa aktualizovať názov', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
      'Opustiť domácnosť',
      'Naozaj chcete opustiť túto domácnosť?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Opustiť',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              const { error } = await supabase
                .from('household_members')
                .delete()
                .eq('household_id', household?.id)
                .eq('user_id', user?.id);

              if (error) throw error;

              showToast('Opustili ste domácnosť', 'success');
              router.replace('/(tabs)');
            } catch (error) {
              showToast('Nepodarilo sa opustiť domácnosť', 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Nastavenia domácnosti</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Základné informácie</Text>
          
          <View style={styles.field}>
            <Text style={styles.label}>Názov domácnosti</Text>
            <Text style={styles.value}>{household?.name}</Text>
            {isAdmin && (
              <TouchableOpacity
                onPress={() => {
                  // Show edit name dialog
                }}
              >
                <Text style={styles.editButton}>Upraviť</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Vytvorené</Text>
            <Text style={styles.value}>
              {household?.created_at && new Date(household.created_at).toLocaleDateString('sk-SK')}
            </Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Akcie</Text>
          
          <Button
            onPress={handleLeaveHousehold}
            variant="destructive"
            fullWidth
          >
            Opustiť domácnosť
          </Button>
        </Card>
      </View>
    </ScreenContainer>
  );
}
```

**Acceptance Criteria:**
- ✅ Invite screen funguje
- ✅ Email validation funguje
- ✅ Role selector funguje
- ✅ Invitation sa odosiela
- ✅ Settings screen zobrazuje info o domácnosti
- ✅ Admin môže upraviť názov
- ✅ Leave household funguje

---

### 🟠 2.3 Settings Sub-screens (1 deň)

**Problém:** Settings.tsx má menu items pre 6 sub-screens, ale žiadny neexistuje.

**Súbory na vytvorenie:**
```
apps/mobile/app/(tabs)/settings/profile.tsx
apps/mobile/app/(tabs)/settings/notifications.tsx
apps/mobile/app/(tabs)/settings/language.tsx
apps/mobile/app/(tabs)/settings/about.tsx
apps/mobile/app/(tabs)/settings/help.tsx
apps/mobile/app/(tabs)/settings/privacy.tsx
```

**2.3.1 Profile Screen**
```tsx
// apps/mobile/app/(tabs)/settings/profile.tsx

export default function ProfileScreen() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const form = useForm<{
    full_name: string;
  }>({
    defaultValues: {
      full_name: '',
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile({
        id: user.id,
        email: user.email || '',
        full_name: profileData?.full_name || '',
      });
      
      form.setValue('full_name', profileData?.full_name || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const onSubmit = async (data: { full_name: string }) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('users')
        .update({ full_name: data.full_name })
        .eq('id', user?.id);

      if (error) throw error;

      showToast('Profil bol aktualizovaný', 'success');
      await loadProfile();
    } catch (error) {
      showToast('Nepodarilo sa aktualizovať profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || '?'}
            </Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.changeAvatar}>Zmeniť fotografiu</Text>
          </TouchableOpacity>
        </View>

        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormInput
              label="Celé meno"
              placeholder="Ján Novák"
              {...field}
            />
          )}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{profile?.email}</Text>
          <Text style={styles.hint}>Email nemožno zmeniť</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          onPress={form.handleSubmit(onSubmit)}
          loading={loading}
          disabled={loading}
          fullWidth
        >
          Uložiť zmeny
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

**2.3.2 Notifications Screen**
```tsx
// apps/mobile/app/(tabs)/settings/notifications.tsx

export default function NotificationsScreen() {
  const [settings, setSettings] = useState({
    loanReminders: true,
    monthlyReports: true,
    householdUpdates: true,
    marketingEmails: false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    
    // TODO: Save to backend
    showToast('Nastavenia boli aktualizované', 'success');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Notifikácie</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Push notifikácie</Text>
          
          <SwitchRow
            label="Upozornenia na splátky"
            description="Pripomienky 3 dni pred splatnosťou"
            value={settings.loanReminders}
            onValueChange={() => handleToggle('loanReminders')}
          />
          
          <SwitchRow
            label="Mesačné reporty"
            description="Súhrn financií každý mesiac"
            value={settings.monthlyReports}
            onValueChange={() => handleToggle('monthlyReports')}
          />
          
          <SwitchRow
            label="Aktualizácie domácnosti"
            description="Zmeny od ostatných členov"
            value={settings.householdUpdates}
            onValueChange={() => handleToggle('householdUpdates')}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Email notifikácie</Text>
          
          <SwitchRow
            label="Marketingové emaily"
            description="Novinky a špeciálne ponuky"
            value={settings.marketingEmails}
            onValueChange={() => handleToggle('marketingEmails')}
          />
        </Card>
      </View>
    </ScreenContainer>
  );
}

// Helper component
function SwitchRow({ label, description, value, onValueChange }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchLabel}>
        <Text style={styles.switchTitle}>{label}</Text>
        <Text style={styles.switchDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}
```

**2.3.3 Language Screen**
```tsx
// apps/mobile/app/(tabs)/settings/language.tsx

export default function LanguageScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState('sk');

  const languages = [
    { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  ];

  const handleSelect = (code: string) => {
    setSelectedLanguage(code);
    // TODO: Save preference and apply i18n
    showToast('Jazyk bol zmenený', 'success');
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Jazyk</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.languageList}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={styles.languageItem}
              onPress={() => handleSelect(lang.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text style={styles.languageName}>{lang.name}</Text>
              </View>
              {selectedLanguage === lang.code && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </Card>
      </View>
    </ScreenContainer>
  );
}
```

**2.3.4 About Screen**
```tsx
// apps/mobile/app/(tabs)/settings/about.tsx

export default function AboutScreen() {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>O aplikácii</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.appName}>FinApp</Text>
          <Text style={styles.version}>Verzia 1.0.0</Text>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Informácie</Text>
          <InfoRow label="Autor" value="Financie Team" />
          <InfoRow label="Website" value="financie.app" />
          <InfoRow label="Email" value="support@financie.app" />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Technológie</Text>
          <Text style={styles.tech}>React Native • Expo • Supabase</Text>
        </Card>

        <Text style={styles.copyright}>
          © 2024 Financie App. Všetky práva vyhradené.
        </Text>
      </View>
    </ScreenContainer>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}
```

**2.3.5 Help Screen**
```tsx
// apps/mobile/app/(tabs)/settings/help.tsx

export default function HelpScreen() {
  const helpTopics = [
    {
      icon: '💰',
      title: 'Úvery',
      description: 'Ako vytvoriť a spravovať úvery',
      screen: 'loans-help',
    },
    {
      icon: '💸',
      title: 'Výdavky a príjmy',
      description: 'Kategorizácia a pravidlá',
      screen: 'transactions-help',
    },
    {
      icon: '🏠',
      title: 'Majetok',
      description: 'Sledovanie a preceňovanie',
      screen: 'assets-help',
    },
    {
      icon: '👥',
      title: 'Domácnosť',
      description: 'Spolupráca s ostatnými',
      screen: 'household-help',
    },
  ];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Pomoc</Text>
      </View>

      <View style={styles.content}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Často kladené otázky</Text>
          
          {helpTopics.map((topic) => (
            <TouchableOpacity
              key={topic.screen}
              style={styles.helpItem}
              onPress={() => {
                // TODO: Navigate to detailed help
              }}
            >
              <View style={styles.helpIcon}>
                <Text style={styles.helpIconText}>{topic.icon}</Text>
              </View>
              <View style={styles.helpContent}>
                <Text style={styles.helpTitle}>{topic.title}</Text>
                <Text style={styles.helpDescription}>{topic.description}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Potrebujete pomoc?</Text>
          <Button variant="outline" fullWidth>
            Kontaktovať podporu
          </Button>
        </Card>
      </View>
    </ScreenContainer>
  );
}
```

**2.3.6 Privacy Screen**
```tsx
// apps/mobile/app/(tabs)/settings/privacy.tsx

export default function PrivacyScreen() {
  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Ochrana súkromia</Text>
        </View>

        <View style={styles.content}>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Vaše údaje</Text>
            <Text style={styles.text}>
              Všetky vaše finančné údaje sú uložené bezpečne v šifrovanej databáze.
              Máte plnú kontrolu nad svojimi dátami.
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Čo zbierame</Text>
            <Text style={styles.text}>
              • Email adresa a meno{'\n'}
              • Finančné transakcie a údaje{'\n'}
              • Preferencie a nastavenia{'\n'}
              • Analytické údaje o používaní
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Ako chránime vaše údaje</Text>
            <Text style={styles.text}>
              • End-to-end šifrovanie{'\n'}
              • Pravidelné bezpečnostné audity{'\n'}
              • GDPR compliance{'\n'}
              • Žiadne zdieľanie s tretími stranami
            </Text>
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Vaše práva</Text>
            <Text style={styles.text}>
              Máte právo na prístup, opravu a vymazanie svojich údajov kedykoľvek.
            </Text>
            <Button variant="outline" fullWidth style={{ marginTop: 16 }}>
              Stiahnuť moje údaje
            </Button>
            <Button variant="destructive" fullWidth style={{ marginTop: 8 }}>
              Vymazať účet
            </Button>
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
```

**Acceptance Criteria:**
- ✅ Všetkých 6 settings screens funguje
- ✅ Profile update funguje
- ✅ Notifications toggles fungujú
- ✅ Language selector funguje
- ✅ About screen zobrazuje správne info
- ✅ Help topics navigable
- ✅ Privacy screen zobrazuje politiku

---

## PHASE 3: Medium Priority Features (1.5 dňa)

### 🟡 3.1 Loan Early Repayment (0.5 dňa)

**Web má:** POST `/api/loans/[id]/early-repayment`

**Súbor na vytvorenie:**
```
apps/mobile/app/(tabs)/loans/[id]/early-repayment.tsx
```

**Implementation:**
```tsx
// apps/mobile/app/(tabs)/loans/[id]/early-repayment.tsx

interface EarlyRepaymentFormData {
  amount: string;
  payment_date: Date;
}

export default function EarlyRepaymentScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const form = useForm<EarlyRepaymentFormData>({
    defaultValues: {
      payment_date: new Date(),
    },
  });

  useEffect(() => {
    loadLoan();
  }, [id]);

  const loadLoan = async () => {
    try {
      const household = await getCurrentHousehold();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}?householdId=${household.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load loan');
      const data = await response.json();
      setLoan(data.loan);
    } catch (error) {
      console.error('Failed to load loan:', error);
    }
  };

  const handlePreview = async () => {
    const amount = form.getValues('amount');
    if (!amount || parseFloat(amount) <= 0) {
      showToast('Zadajte platnú sumu', 'error');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/early-repayment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            payment_date: form.getValues('payment_date').toISOString(),
            preview: true, // Just preview, don't save
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to preview');
      const data = await response.json();
      setPreview(data);
    } catch (error) {
      showToast('Nepodarilo sa vypočítať náhľad', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    Alert.alert(
      'Potvrdiť predčasné splatenie',
      `Naozaj chcete splatiť ${formatCurrency(form.getValues('amount'))}?`,
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Potvrdiť',
          onPress: async () => {
            try {
              setLoading(true);
              const { data: { session } } = await supabase.auth.getSession();
              
              const response = await fetch(
                `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/early-repayment`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                  },
                  body: JSON.stringify({
                    amount: parseFloat(form.getValues('amount')),
                    payment_date: form.getValues('payment_date').toISOString(),
                  }),
                }
              );

              if (!response.ok) throw new Error('Failed to process early repayment');

              showToast('Predčasné splatenie bolo zaznamenané', 'success');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              showToast('Nepodarilo sa zaznamenať platbu', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.title}>Predčasné splatenie</Text>
        <Text style={styles.subtitle}>{loan?.lender}</Text>
      </View>

      <View style={styles.form}>
        <Card style={styles.loanInfo}>
          <Text style={styles.infoLabel}>Zostávajúca istina:</Text>
          <Text style={styles.infoValue}>
            {loan && formatCurrency(loan.remaining_principal)}
          </Text>
        </Card>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <CurrencyInput
              label="Suma na splatenie"
              placeholder="0.00"
              {...field}
            />
          )}
        />

        <FormField
          control={form.control}
          name="payment_date"
          render={({ field }) => (
            <FormDatePicker
              label="Dátum platby"
              {...field}
            />
          )}
        />

        <Button
          onPress={handlePreview}
          variant="outline"
          fullWidth
          loading={loading}
        >
          Zobraziť náhľad
        </Button>

        {preview && (
          <Card style={styles.preview}>
            <Text style={styles.previewTitle}>Náhľad dopadu</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Nová zostávajúca istina:</Text>
              <Text style={styles.previewValue}>
                {formatCurrency(preview.new_remaining_principal)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Ušetrený úrok:</Text>
              <Text style={[styles.previewValue, styles.positive]}>
                {formatCurrency(preview.saved_interest)}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Nový počet splátok:</Text>
              <Text style={styles.previewValue}>
                {preview.new_installment_count}
              </Text>
            </View>
          </Card>
        )}
      </View>

      <View style={styles.actions}>
        <Button
          onPress={handleConfirm}
          loading={loading}
          disabled={loading || !preview}
          fullWidth
        >
          Potvrdiť splatenie
        </Button>
        <Button
          onPress={() => router.back()}
          variant="outline"
          fullWidth
        >
          Zrušiť
        </Button>
      </View>
    </ScreenContainer>
  );
}
```

**Link v LoanDetailScreen:**
```tsx
// Add button in apps/mobile/app/(tabs)/loans/[id]/index.tsx
<Button
  onPress={() => router.push(`/(tabs)/loans/${id}/early-repayment`)}
  variant="outline"
>
  Predčasné splatenie
</Button>
```

**Acceptance Criteria:**
- ✅ Early repayment screen funguje
- ✅ Preview calculation funguje
- ✅ Confirmation dialog zobrazený
- ✅ Early repayment sa zaznamenáva
- ✅ Schedule sa regeneruje
- ✅ Success toast a navigation back

---

### 🟡 3.2 Subscription Management (0.5 dňa)

**Web má:** `/dashboard/subscription` s Stripe integration

**Súbor na vytvorenie:**
```
apps/mobile/app/(tabs)/settings/subscription.tsx
```

**Implementation (simplified version bez Stripe checkout):**
```tsx
// apps/mobile/app/(tabs)/settings/subscription.tsx

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      '1 domácnosť',
      '3 členovia max',
      'Základné funkcie',
      'Mesačné výkazy',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    features: [
      '3 domácnosti',
      'Neobmedzený počet členov',
      'Všetky funkcie',
      'Prioritná podpora',
      'Export do PDF',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    features: [
      'Neobmedzené domácnosti',
      'Neobmedzený počet členov',
      'Všetky funkcie',
      'VIP podpora',
      'API prístup',
    ],
  },
];

export default function SubscriptionScreen() {
  const [currentPlan, setCurrentPlan] = useState<string>('free');

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const household = await getCurrentHousehold();
      const { data: { session } } = await supabase.auth.getSession();
      
      // Load subscription status from API
      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/subscription/status?householdId=${household.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCurrentPlan(data.plan || 'free');
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const handleUpgrade = (planId: string) => {
    Alert.alert(
      'Upgrade plán',
      'Pre upgrade kontaktujte podporu alebo použite webovú aplikáciu.',
      [
        { text: 'OK' },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Predplatné</Text>
          <Text style={styles.subtitle}>
            Aktuálny plán: <Text style={styles.currentPlan}>{currentPlan.toUpperCase()}</Text>
          </Text>
        </View>

        <View style={styles.content}>
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            
            return (
              <Card
                key={plan.id}
                style={[
                  styles.planCard,
                  isCurrent && styles.currentPlanCard,
                ]}
              >
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Badge variant="success">Aktuálny plán</Badge>
                  </View>
                )}
                
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>
                    {plan.price === 0 ? 'Zadarmo' : `€${plan.price}`}
                  </Text>
                  {plan.price > 0 && (
                    <Text style={styles.pricePeriod}>/mesiac</Text>
                  )}
                </View>

                <View style={styles.features}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.feature}>
                      <Text style={styles.featureIcon}>✓</Text>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {!isCurrent && (
                  <Button
                    onPress={() => handleUpgrade(plan.id)}
                    fullWidth
                  >
                    {plan.price === 0 ? 'Prejsť na Free' : 'Upgrade'}
                  </Button>
                )}
              </Card>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Všetky plány obsahujú 14-dňovú bezplatnú skúšobnú dobu.
          </Text>
          <TouchableOpacity>
            <Text style={styles.link}>Zobraziť porovnanie plánov</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
```

**Link v Settings:**
```tsx
// Add menu item in apps/mobile/app/(tabs)/settings.tsx
<TouchableOpacity
  style={styles.menuItem}
  onPress={() => router.push('/(tabs)/settings/subscription')}
>
  <View style={styles.menuLeft}>
    <Text style={styles.menuIcon}>💳</Text>
    <Text style={styles.menuLabel}>Predplatné</Text>
  </View>
  <Text style={styles.chevron}>›</Text>
</TouchableOpacity>
```

**Acceptance Criteria:**
- ✅ Subscription screen zobrazuje plány
- ✅ Current plan highlighted
- ✅ Features listy zobrazené
- ✅ Upgrade button funguje (redirects alebo shows info)

---

### 🟡 3.3 Loan Simulate Scenarios (0.5 dňa)

**Web má:** POST `/api/loans/[id]/simulate`

**Súbor na vytvorenie:**
```
apps/mobile/app/(tabs)/loans/[id]/simulate.tsx
```

**Implementation:**
```tsx
// apps/mobile/app/(tabs)/loans/[id]/simulate.tsx

interface SimulationParams {
  new_rate?: number;
  new_term?: number;
  extra_payment_monthly?: number;
}

interface SimulationResult {
  original: {
    total_interest: number;
    total_cost: number;
    monthly_payment: number;
  };
  simulated: {
    total_interest: number;
    total_cost: number;
    monthly_payment: number;
  };
  savings: {
    interest_saved: number;
    time_saved_months: number;
  };
}

export default function SimulateScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const form = useForm<SimulationParams>({
    defaultValues: {
      new_rate: undefined,
      new_term: undefined,
      extra_payment_monthly: undefined,
    },
  });

  useEffect(() => {
    loadLoan();
  }, [id]);

  const loadLoan = async () => {
    try {
      const household = await getCurrentHousehold();
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}?householdId=${household.id}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load loan');
      const data = await response.json();
      setLoan(data.loan);
      
      // Set default values
      form.setValue('new_rate', data.loan.annual_interest_rate);
      form.setValue('new_term', data.loan.term_months);
    } catch (error) {
      console.error('Failed to load loan:', error);
    }
  };

  const handleSimulate = async (data: SimulationParams) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/loans/${id}/simulate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) throw new Error('Simulation failed');
      const resultData = await response.json();
      setResult(resultData);
    } catch (error) {
      showToast('Nepodarilo sa vypočítať simuláciu', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Simulácia scenárov</Text>
          <Text style={styles.subtitle}>{loan?.lender}</Text>
        </View>

        <View style={styles.form}>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Simulovať zmeny</Text>
            
            <FormField
              control={form.control}
              name="new_rate"
              render={({ field }) => (
                <FormInput
                  label="Nová úroková sadzba (%)"
                  placeholder={loan?.annual_interest_rate?.toString()}
                  keyboardType="decimal-pad"
                  {...field}
                />
              )}
            />

            <FormField
              control={form.control}
              name="new_term"
              render={({ field }) => (
                <FormInput
                  label="Nová doba splácania (mesiace)"
                  placeholder={loan?.term_months?.toString()}
                  keyboardType="number-pad"
                  {...field}
                />
              )}
            />

            <FormField
              control={form.control}
              name="extra_payment_monthly"
              render={({ field }) => (
                <CurrencyInput
                  label="Mesačná nadplatba"
                  placeholder="0.00"
                  {...field}
                />
              )}
            />

            <Button
              onPress={form.handleSubmit(handleSimulate)}
              loading={loading}
              fullWidth
            >
              Spustiť simuláciu
            </Button>
          </Card>

          {result && (
            <>
              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Pôvodný plán</Text>
                <ResultRow
                  label="Mesačná splátka"
                  value={formatCurrency(result.original.monthly_payment.toString())}
                />
                <ResultRow
                  label="Celkový úrok"
                  value={formatCurrency(result.original.total_interest.toString())}
                />
                <ResultRow
                  label="Celková suma"
                  value={formatCurrency(result.original.total_cost.toString())}
                />
              </Card>

              <Card style={styles.section}>
                <Text style={styles.sectionTitle}>Simulovaný plán</Text>
                <ResultRow
                  label="Mesačná splátka"
                  value={formatCurrency(result.simulated.monthly_payment.toString())}
                />
                <ResultRow
                  label="Celkový úrok"
                  value={formatCurrency(result.simulated.total_interest.toString())}
                />
                <ResultRow
                  label="Celková suma"
                  value={formatCurrency(result.simulated.total_cost.toString())}
                />
              </Card>

              <Card style={[styles.section, styles.savingsCard]}>
                <Text style={styles.sectionTitle}>💰 Úspora</Text>
                <ResultRow
                  label="Ušetrený úrok"
                  value={formatCurrency(result.savings.interest_saved.toString())}
                  highlight="positive"
                />
                <ResultRow
                  label="Skrátenie doby"
                  value={`${result.savings.time_saved_months} mesiacov`}
                  highlight="positive"
                />
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ResultRow({ label, value, highlight }: {
  label: string;
  value: string;
  highlight?: 'positive' | 'negative';
}) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text
        style={[
          styles.resultValue,
          highlight === 'positive' && styles.positive,
          highlight === 'negative' && styles.negative,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}
```

**Link v LoanDetailScreen:**
```tsx
<Button
  onPress={() => router.push(`/(tabs)/loans/${id}/simulate`)}
  variant="outline"
>
  Simulovať scenáre
</Button>
```

**Acceptance Criteria:**
- ✅ Simulate screen funguje
- ✅ Form validation funguje
- ✅ Simulation calculation funguje
- ✅ Results zobrazené prehľadne
- ✅ Savings highlighted

---

## PHASE 4: Low Priority Features (Optional)

### 🟢 4.1 Income Templates (optional)

**Note:** V pláne označené ako "optional advanced feature". Implementovať len ak je čas.

**Súbory:**
```
apps/mobile/app/(tabs)/incomes/templates.tsx
apps/mobile/app/(tabs)/incomes/templates/new.tsx
```

---

### 🟢 4.2 Charts Enhancement (optional)

**Library:** `react-native-chart-kit` alebo `victory-native`

**Lokácia:** Dashboard screen

**Charts:**
- Monthly income/expense trend (line chart)
- Expense by category (pie chart)
- Net worth over time (area chart)

---

### 🟢 4.3 Real-time Subscriptions

**Verify implementation:**
```typescript
// apps/mobile/src/lib/realtime.ts

export function setupRealtimeSubscriptions(householdId: string) {
  const channel = supabase
    .channel('household-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'expenses',
      filter: `household_id=eq.${householdId}`
    }, (payload) => {
      // Handle expense change
      console.log('Expense changed:', payload);
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'incomes',
      filter: `household_id=eq.${householdId}`
    }, (payload) => {
      // Handle income change
      console.log('Income changed:', payload);
    })
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'loans',
      filter: `household_id=eq.${householdId}`
    }, (payload) => {
      // Handle loan change
      console.log('Loan changed:', payload);
    })
    .subscribe();

  return channel;
}

export function cleanupRealtimeSubscriptions(channel: any) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
```

**Usage in Dashboard:**
```tsx
// apps/mobile/app/(tabs)/index.tsx

useEffect(() => {
  let channel: any;
  
  const setup = async () => {
    const household = await getCurrentHousehold();
    channel = setupRealtimeSubscriptions(household.id);
  };
  
  setup();
  
  return () => {
    cleanupRealtimeSubscriptions(channel);
  };
}, []);
```

---

## Timeline & Effort Estimate

### Time Breakdown

| Phase | Task | Priority | Estimate |
|-------|------|----------|----------|
| **1** | Assets Tab | 🔴 CRITICAL | 15 min |
| **1** | Rules Management | 🔴 CRITICAL | 0.5 dňa |
| **1** | Audit Log | 🔴 CRITICAL | 0.5 dňa |
| **2** | Category Create/Edit | 🟠 HIGH | 0.5 dňa |
| **2** | Household Invite/Settings | 🟠 HIGH | 0.5 dňa |
| **2** | Settings Sub-screens (6x) | 🟠 HIGH | 1 deň |
| **3** | Loan Early Repayment | 🟡 MEDIUM | 0.5 dňa |
| **3** | Subscription Management | 🟡 MEDIUM | 0.5 dňa |
| **3** | Loan Simulate | 🟡 MEDIUM | 0.5 dňa |
| **4** | Income Templates | 🟢 LOW | (skip) |
| **4** | Charts | 🟢 LOW | (skip) |
| **4** | Real-time | 🟢 LOW | (verify) |

### Total Estimate

- **Critical + High:** 3.5 dní
- **Medium:** 1.5 dňa
- **Low:** (optional)

**TOTAL: 5-6 pracovných dní**

---

## Implementation Order

**Day 1:**
1. ✅ Assets Tab (15 min)
2. ✅ Rules Management (0.5 dňa)
3. ✅ Audit Log (0.5 dňa)

**Day 2:**
4. ✅ Category Create/Edit (0.5 dňa)
5. ✅ Household Invite/Settings (0.5 dňa)

**Day 3-4:**
6. ✅ Settings Sub-screens (1 deň)
   - Profile
   - Notifications
   - Language
   - About
   - Help
   - Privacy

**Day 5:**
7. ✅ Loan Early Repayment (0.5 dňa)
8. ✅ Subscription Management (0.5 dňa)

**Day 6:**
9. ✅ Loan Simulate (0.5 dňa)
10. ✅ Testing & Polish (0.5 dňa)

---

## Testing Checklist

### Per Feature Testing

- [ ] Rules Management
  - [ ] List rules
  - [ ] Create rule
  - [ ] Delete rule
  - [ ] Match types fungujú
  - [ ] Empty state

- [ ] Audit Log
  - [ ] List entries
  - [ ] Filters fungujú
  - [ ] Expand changes
  - [ ] Relative time formatting

- [ ] Categories
  - [ ] Create category
  - [ ] Edit category
  - [ ] Parent category picker
  - [ ] Kind selector

- [ ] Household
  - [ ] Invite member
  - [ ] Settings screen
  - [ ] Leave household

- [ ] Settings Sub-screens
  - [ ] Profile update
  - [ ] Notifications toggles
  - [ ] Language selector
  - [ ] About info
  - [ ] Help topics
  - [ ] Privacy policy

- [ ] Loan Features
  - [ ] Early repayment
  - [ ] Simulate scenarios
  - [ ] Preview calculations

- [ ] Subscription
  - [ ] Display plans
  - [ ] Current plan highlighted
  - [ ] Upgrade button

### Cross-feature Testing

- [ ] Navigation medzi všetkými screens funguje
- [ ] Back buttons fungujú správne
- [ ] Loading states zobrazené
- [ ] Error handling funguje
- [ ] Toasts zobrazené pri actions
- [ ] Pull-to-refresh funguje
- [ ] Empty states zobrazené
- [ ] Forms validation funguje
- [ ] Haptic feedback pri actions

### Device Testing

- [ ] iOS (iPhone 12+)
- [ ] Android (emulator)
- [ ] Rôzne screen sizes
- [ ] Dark mode (ak implementovaný)
- [ ] Landscape orientation

---

## Success Criteria

**Feature Parity Achieved:**
- ✅ Všetky CRITICAL features implementované
- ✅ Všetky HIGH priority features implementované
- ✅ MEDIUM features implementované (optional)

**Quality Standards:**
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ Všetky API endpoints fungujú
- ✅ Validation schemas použité
- ✅ Error handling implementovaný
- ✅ Loading states zobrazené
- ✅ Success/error toasts
- ✅ Haptic feedback

**User Experience:**
- ✅ Smooth animations
- ✅ Intuitive navigation
- ✅ Consistent styling
- ✅ Responsive layout
- ✅ Accessibility support

---

## Dependencies & Prerequisites

### Existing Infrastructure (Already Done)

- ✅ ENV configuration
- ✅ TypeScript strict mode
- ✅ UI component library
- ✅ Form infrastructure
- ✅ API client
- ✅ Auth flow
- ✅ Basic CRUD operations

### Required for Implementation

- Web API endpoints (already exist)
- @finapp/core schemas (already exist)
- Supabase client (already configured)
- Navigation structure (already set up)

### No Additional Dependencies Needed

Všetky potrebné dependencies už sú nainštalované v `apps/mobile/package.json`.

---

## Risk Mitigation

### Potential Issues

1. **API Compatibility**
   - Risk: Mobile-specific edge cases
   - Mitigation: Extensive testing proti production API

2. **TypeScript Errors**
   - Risk: Type mismatches
   - Mitigation: Strict validation, use @finapp/core schemas

3. **Performance**
   - Risk: Slow screens, laggy animations
   - Mitigation: Optimistic updates, skeleton loaders

4. **Navigation Bugs**
   - Risk: Broken back buttons, stack overflow
   - Mitigation: Test all navigation paths

### Rollback Plan

Pre každú feature:
1. Git branch per feature
2. Test thoroughly pred merge
3. Možnosť revert commit ak issues

---

## Post-Implementation

### Code Review Checklist

- [ ] TypeScript strict mode bez errors
- [ ] ESLint bez warnings
- [ ] Proper error handling
- [ ] Loading states
- [ ] Success/error feedback
- [ ] Consistent styling
- [ ] Proper navigation
- [ ] Clean code structure

### Documentation

- [ ] Update README ak potrebné
- [ ] Update IMPLEMENTATION_COMPLETE.md
- [ ] Mark todos as done v plánoch

### Deployment

- [ ] Test na development build
- [ ] Create preview build (EAS)
- [ ] Internal testing
- [ ] Production build

---

## Appendix

### File Structure Overview

```
apps/mobile/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx                    [✅ UPDATE - add Assets tab]
│   │   ├── assets.tsx                     [✅ EXISTS]
│   │   ├── rules.tsx                      [❌ CREATE]
│   │   ├── rules/
│   │   │   └── new.tsx                    [❌ CREATE]
│   │   ├── audit.tsx                      [❌ CREATE]
│   │   ├── categories/
│   │   │   ├── new.tsx                    [❌ CREATE]
│   │   │   └── [id]/
│   │   │       └── edit.tsx               [❌ CREATE]
│   │   ├── household/
│   │   │   ├── invite.tsx                 [❌ CREATE]
│   │   │   └── settings.tsx               [❌ CREATE]
│   │   ├── settings/
│   │   │   ├── profile.tsx                [❌ CREATE]
│   │   │   ├── notifications.tsx          [❌ CREATE]
│   │   │   ├── language.tsx               [❌ CREATE]
│   │   │   ├── about.tsx                  [❌ CREATE]
│   │   │   ├── help.tsx                   [❌ CREATE]
│   │   │   ├── privacy.tsx                [❌ CREATE]
│   │   │   └── subscription.tsx           [❌ CREATE]
│   │   └── loans/
│   │       └── [id]/
│   │           ├── early-repayment.tsx    [❌ CREATE]
│   │           └── simulate.tsx           [❌ CREATE]
│   └── src/
│       └── lib/
│           ├── api.ts                     [✅ UPDATE - add new API functions]
│           └── realtime.ts                [🟢 VERIFY]
```

### API Endpoints Reference

**Already Available in Web:**

```
GET    /api/rules
POST   /api/rules
DELETE /api/rules/[id]

GET    /api/audit

POST   /api/categories
PUT    /api/categories/[id]

POST   /api/household/invite
GET    /api/household/members/[id]

POST   /api/loans/[id]/early-repayment
POST   /api/loans/[id]/simulate

GET    /api/subscription/status
```

---

**End of Implementation Plan**

Tento plán pokrýva všetky chýbajúce features potrebné pre dosiahnutie feature parity medzi web a mobilnou aplikáciou. Prioritizácia umožňuje implementovať najdôležitejšie funkcie prvé a optional features nechať na neskôr.

