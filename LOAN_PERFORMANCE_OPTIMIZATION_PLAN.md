# 📋 Loan Performance Optimization - Implementačný plán

## 🎯 Cieľ
Optimalizovať performance loan detail stránky z **8-12s → <1s** initial load a dosiahnuť **60 FPS** pri scrollovaní tabuľky s 360 riadkami.

## 📊 Target metriky

| Metrika | Pred | Po | Zlepšenie |
|---------|------|-----|-----------|
| Initial Load | 8-12s | **<1s** | **12×** |
| Loan detail (360 splátok) | 3-5s | **<500ms** | **10×** |
| Pay action | 2s | **<150ms** (optimistic) | **13×** |
| Table scroll | Lag | **60 FPS** | ∞ |
| Memory | 500MB+ | **<100MB** | **5×** |

---

## 🏗️ Architektúra

### Tech Stack
- ✅ **@tanstack/react-query v5** - State management + caching
- ✅ **@tanstack/react-virtual** - Virtualizácia tabuliek
- ✅ **Next.js Edge Runtime** - Sub-50ms response time
- ✅ **Supabase Indexes** - 10-100× rýchlejšie queries
- ✅ **Materialized Views** - Predpočítané agregácie
- ✅ **Next.js Data Cache** - Server-side caching
- ✅ **Vercel Edge CDN** - HTTP caching

### Caching Strategy
```
Browser Cache (React Query)
    ↓ 5min stale
Edge CDN (Vercel)
    ↓ 60s cache
Next.js Data Cache
    ↓ 60s revalidate
Supabase (Materialized Views)
    ↓ On-demand refresh
PostgreSQL (Indexes)
```

---

## 📦 Fáza 0: Príprava (10 min)

### 0.1 Inštalácia dependencies
```bash
cd apps/web
pnpm add @tanstack/react-query @tanstack/react-virtual
```

### 0.2 Vytvorenie nových súborov
```
apps/web/src/
├── lib/
│   └── react-query/
│       ├── client.ts              # QueryClient konfigurácia
│       └── provider.tsx           # QueryClientProvider wrapper
├── hooks/
│   └── useLoansData.ts           # Custom hooks (useLoanSchedule, usePayInstallment...)
├── components/
│   └── loans/
│       ├── VirtualizedScheduleTable.tsx  # Virtualizovaná tabuľka
│       ├── ScheduleRow.tsx              # Optimalizovaný row komponent
│       ├── SchedulePagination.tsx       # Pagination controls
│       ├── ScheduleSkeleton.tsx         # Loading skeleton
│       ├── LoanHeader.tsx               # Header sekcia
│       ├── LoanMetricsCards.tsx         # KPI karty
│       └── LoanDetailsCards.tsx         # Detail karty
└── app/
    └── api/
        └── loans/
            └── [id]/
                └── schedule/
                    └── route.ts          # Pagination endpoint

supabase/
└── migrations/
    └── 20241030_optimize_loans_performance.sql
```

---

## 🗄️ Fáza 1: Database optimalizácie (30 min)

### 1.1 Vytvoriť migration súbor
**Súbor:** `supabase/migrations/20241030_optimize_loans_performance.sql`

```sql
-- =====================================================
-- FÁZA 1: INDEXES PRE RÝCHLE QUERIES
-- =====================================================

-- Index pre loan_schedules (90% queries používajú tento pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_schedules_composite 
ON loan_schedules(loan_id, status, due_date) 
INCLUDE (principal_due, interest_due, fees_due, total_due, principal_balance_after);

-- Index pre loans filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loans_household_status 
ON loans(household_id, status) 
INCLUDE (principal, annual_rate, term_months);

-- Index pre rýchle counting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_loan_schedules_status 
ON loan_schedules(loan_id, status);

-- =====================================================
-- FÁZA 2: MATERIALIZED VIEW PRE AGREGÁCIE
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS loan_metrics AS
SELECT 
  l.id as loan_id,
  l.household_id,
  -- Počty splátok
  COUNT(s.id) as total_installments,
  COUNT(s.id) FILTER (WHERE s.status = 'paid') as paid_count,
  COUNT(s.id) FILTER (WHERE s.status = 'overdue') as overdue_count,
  COUNT(s.id) FILTER (WHERE s.status = 'pending') as pending_count,
  COUNT(s.id) FILTER (
    WHERE s.status = 'pending' 
    AND s.due_date <= CURRENT_DATE + INTERVAL '7 days'
    AND s.due_date >= CURRENT_DATE
  ) as due_soon_count,
  
  -- Finančné metriky
  COALESCE(SUM(s.total_due) FILTER (WHERE s.status != 'paid'), 0) as remaining_amount,
  COALESCE(SUM(s.total_due) FILTER (WHERE s.status = 'paid'), 0) as paid_amount,
  COALESCE(SUM(s.principal_due) FILTER (WHERE s.status = 'paid'), 0) as paid_principal,
  COALESCE(SUM(s.interest_due), 0) as total_interest,
  COALESCE(SUM(s.fees_due), 0) as total_fees,
  COALESCE(SUM(s.total_due), 0) as total_payment,
  
  -- Aktuálny zostatok (z poslednej splatenej splátky)
  COALESCE(
    (SELECT principal_balance_after 
     FROM loan_schedules 
     WHERE loan_id = l.id 
     AND status = 'paid' 
     ORDER BY installment_no DESC 
     LIMIT 1),
    l.principal
  ) as current_balance,
  
  -- Next installment info
  (SELECT json_build_object(
    'installment_no', installment_no,
    'due_date', due_date,
    'total_due', total_due,
    'days_until', due_date - CURRENT_DATE
   )
   FROM loan_schedules
   WHERE loan_id = l.id
   AND status IN ('pending', 'overdue')
   ORDER BY installment_no ASC
   LIMIT 1
  ) as next_installment,
  
  -- Timestamps
  NOW() as last_updated
  
FROM loans l
LEFT JOIN loan_schedules s ON s.loan_id = l.id
GROUP BY l.id, l.household_id, l.principal;

-- Unique index pre CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_loan_metrics_loan_id 
ON loan_metrics(loan_id);

-- =====================================================
-- FÁZA 3: AUTO-REFRESH TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION refresh_loan_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh len pre affected loan_id
  -- (Pre produkciu by sme mali rate limit alebo queue)
  REFRESH MATERIALIZED VIEW CONCURRENTLY loan_metrics;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger na zmeny v loan_schedules
DROP TRIGGER IF EXISTS trigger_refresh_loan_metrics ON loan_schedules;
CREATE TRIGGER trigger_refresh_loan_metrics
AFTER INSERT OR UPDATE OR DELETE ON loan_schedules
FOR EACH STATEMENT 
EXECUTE FUNCTION refresh_loan_metrics();

-- Trigger na zmeny v loans
DROP TRIGGER IF EXISTS trigger_refresh_loan_metrics_loans ON loans;
CREATE TRIGGER trigger_refresh_loan_metrics_loans
AFTER INSERT OR UPDATE OR DELETE ON loans
FOR EACH STATEMENT 
EXECUTE FUNCTION refresh_loan_metrics();

-- =====================================================
-- FÁZA 4: OPTIMALIZÁCIA RLS POLICIES (ak existujú)
-- =====================================================

-- Reindex existujúce tabuľky pre rýchlejšie RLS checks
-- (VACUUM ANALYZE je dobré spustiť po indexoch)
VACUUM ANALYZE loans;
VACUUM ANALYZE loan_schedules;

-- Initial refresh
REFRESH MATERIALIZED VIEW loan_metrics;
```

### 1.2 Spustiť migráciu
```bash
# Testovať lokálne
supabase db reset

# Push do production
supabase db push
```

### 1.3 Validácia
```sql
-- Overiť že indexy sú použité
EXPLAIN ANALYZE 
SELECT * FROM loan_schedules 
WHERE loan_id = 'xxx' 
AND status = 'pending' 
ORDER BY due_date;

-- Overiť materialized view
SELECT * FROM loan_metrics LIMIT 10;

-- Performance check
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename IN ('loans', 'loan_schedules')
ORDER BY idx_scan DESC;
```

**Expected výsledok:** Queries z 500-1000ms → **50-100ms**

---

## 🔌 Fáza 2: API Layer refactor (1.5h)

### 2.1 Nový pagination endpoint
**Súbor:** `apps/web/src/app/api/loans/[id]/schedule/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const runtime = 'edge'; // ⚡ Vercel Edge
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(10).max(100).default(50),
  status: z.enum(['paid', 'pending', 'overdue']).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validácia query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { page, limit, status } = querySchema.parse(searchParams);

    // Paralelné queries (50-100ms total)
    const [scheduleResult, metricsResult] = await Promise.all([
      // Stránkovaný schedule
      supabase
        .from('loan_schedules')
        .select('*', { count: 'exact' })
        .eq('loan_id', params.id)
        .apply((query) => status ? query.eq('status', status) : query)
        .range((page - 1) * limit, page * limit - 1)
        .order('installment_no', { ascending: true }),
      
      // Metriky z materialized view (instant)
      supabase
        .from('loan_metrics')
        .select('*')
        .eq('loan_id', params.id)
        .single()
    ]);

    if (scheduleResult.error) throw scheduleResult.error;

    return NextResponse.json({
      schedule: scheduleResult.data ?? [],
      count: scheduleResult.count ?? 0,
      page,
      limit,
      pages: Math.ceil((scheduleResult.count ?? 0) / limit),
      metrics: metricsResult.data,
    }, {
      headers: {
        // Vercel Edge Cache (CDN layer)
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        'CDN-Cache-Control': 'public, s-maxage=60',
      }
    });
  } catch (error) {
    console.error('GET /api/loans/[id]/schedule error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.2 Optimalizovať pay endpoint
**Súbor:** `apps/web/src/app/api/loans/[id]/pay/route.ts`

```typescript
// Pridať do existujúceho POST handlera:

// Po úspešnom zaplatení vráť aktualizované dáta
const { data: updatedSchedule } = await supabase
  .from('loan_schedules')
  .select('*')
  .eq('loan_id', loanId)
  .order('installment_no', { ascending: true });

return NextResponse.json({
  success: true,
  payment,
  installment,
  updatedSchedule, // ← Pre optimistic update
}, {
  headers: {
    'Cache-Control': 'no-store', // Invalidate cache
  }
});
```

### 2.3 Testovanie
```bash
# Test pagination
curl "http://localhost:3000/api/loans/{id}/schedule?page=1&limit=50"

# Test caching
curl -I "http://localhost:3000/api/loans/{id}/schedule"

# Check response time
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/loans/{id}/schedule"
```

**Expected výsledok:** API response < 100ms, cache hit < 10ms

---

## ⚛️ Fáza 3: React Query setup (1h)

### 3.1 QueryClient konfigurácia
**Súbor:** `apps/web/src/lib/react-query/client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 min fresh
        gcTime: 15 * 60 * 1000, // 15 min v pamäti (predtým cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
```

### 3.2 Provider setup
**Súbor:** `apps/web/src/lib/react-query/provider.tsx`

```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { makeQueryClient } from './client';
import { useState } from 'react';

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures client is created only once
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

### 3.3 Integrácia do root layout
**Súbor:** `apps/web/src/app/layout.tsx`

```typescript
import { ReactQueryProvider } from '@/lib/react-query/provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sk">
      <body>
        <ReactQueryProvider>
          {/* Ostatné providery */}
          {children}
        </ReactQueryProvider>
      </body>
    </html>
  );
}
```

### 3.4 Custom hooks
**Súbor:** `apps/web/src/hooks/useLoansData.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =====================================================
// QUERY: Loan Schedule
// =====================================================
export function useLoanSchedule(
  loanId: string, 
  page = 1,
  initialData?: any
) {
  return useQuery({
    queryKey: ['loan-schedule', loanId, page],
    queryFn: async () => {
      const res = await fetch(`/api/loans/${loanId}/schedule?page=${page}&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return res.json();
    },
    initialData,
    enabled: !!loanId,
  });
}

// =====================================================
// QUERY: Loan Metrics
// =====================================================
export function useLoanMetrics(loanId: string) {
  return useQuery({
    queryKey: ['loan-metrics', loanId],
    queryFn: async () => {
      const res = await fetch(`/api/loans/${loanId}/metrics`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    enabled: !!loanId,
  });
}

// =====================================================
// MUTATION: Pay Installment
// =====================================================
export function usePayInstallment(loanId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { installmentId: string; amount: number }) => {
      const res = await fetch(`/api/loans/${loanId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Payment failed');
      }
      return res.json();
    },
    
    // Optimistic update - okamžitá zmena UI
    onMutate: async ({ installmentId }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ 
        queryKey: ['loan-schedule', loanId] 
      });
      
      // Snapshot previous data
      const previousData = queryClient.getQueryData(['loan-schedule', loanId]);
      
      // Optimistically update
      queryClient.setQueryData(['loan-schedule', loanId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          schedule: old.schedule.map((s: any) =>
            s.id === installmentId 
              ? { ...s, status: 'paid', paid_at: new Date().toISOString() } 
              : s
          ),
        };
      });
      
      return { previousData };
    },
    
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ['loan-schedule', loanId], 
          context.previousData
        );
      }
    },
    
    onSettled: () => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['loan-schedule', loanId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['loan-metrics', loanId] 
      });
    },
  });
}

// =====================================================
// MUTATION: Mark Paid Until Today
// =====================================================
export function useMarkPaidUntilToday(loanId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (date: string) => {
      const res = await fetch(`/api/loans/${loanId}/mark-paid-until-today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error('Failed to mark installments');
      return res.json();
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-schedule', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan-metrics', loanId] });
    },
  });
}

// =====================================================
// MUTATION: Regenerate Schedule
// =====================================================
export function useRegenerateSchedule(loanId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/loans/${loanId}/regenerate-schedule`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to regenerate schedule');
      return res.json();
    },
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-schedule', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan-metrics', loanId] });
    },
  });
}
```

**Expected výsledok:** Okamžité UI updates, automatický cache management

---

## 🚀 Fáza 4: Server Components optimalizácia (45 min)

### 4.1 Refactor page.tsx
**Súbor:** `apps/web/src/app/dashboard/loans/[id]/page.tsx`

```typescript
import { Suspense } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { unstable_cache } from 'next/cache';
import { Card } from '@finapp/ui';
import { LoanDetailClient } from './LoanDetailClient';
import { ScheduleSkeleton } from '@/components/loans/ScheduleSkeleton';
import { LoanHeader } from '@/components/loans/LoanHeader';

// Cached funkcia s Next.js Data Cache
const getLoanData = unstable_cache(
  async (loanId: string) => {
    const supabase = await createClient();
    
    // Paralelné fetching (3 queries súčasne)
    const [loanResult, scheduleResult, metricsResult] = await Promise.all([
      supabase
        .from('loans')
        .select('*')
        .eq('id', loanId)
        .single(),
      
      supabase
        .from('loan_schedules')
        .select('*')
        .eq('loan_id', loanId)
        .order('installment_no', { ascending: true })
        .limit(50), // Prvých 50 riadkov (zvyšok lazy load)
      
      supabase
        .from('loan_metrics')
        .select('*')
        .eq('loan_id', loanId)
        .single()
    ]);
    
    if (loanResult.error || !loanResult.data) {
      return null;
    }
    
    return {
      loan: loanResult.data,
      initialSchedule: scheduleResult.data ?? [],
      metrics: metricsResult.data,
    };
  },
  ['loan-detail'],
  { 
    revalidate: 60, // 1 min cache
    tags: ['loans'] // Invalidácia pomocou revalidateTag('loans')
  }
);

export default async function LoanDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const data = await getLoanData(params.id);
  
  if (!data) {
    notFound();
  }

  const { loan, initialSchedule, metrics } = data;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link 
        href="/dashboard/loans" 
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Späť na úvery
      </Link>

      {/* Header - static, renders immediately */}
      <LoanHeader loan={loan} metrics={metrics} />

      {/* Alerts - static */}
      {metrics?.overdue_count > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-center">
            <span className="text-2xl">⚠️</span>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Máte {metrics.overdue_count} {metrics.overdue_count === 1 ? 'omeškanú splátku' : 'omeškané splátky'}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Metrics cards - static */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="p-4">
            <p className="text-sm text-muted-foreground">Aktuálny zostatok</p>
            <p className="text-2xl font-bold">
              {Number(metrics?.current_balance ?? loan.principal).toFixed(2)} €
            </p>
          </div>
        </Card>
        {/* Ďalšie karty... */}
      </div>

      {/* Schedule table - Suspense boundary */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Splátkový kalendár</h2>
          <Suspense fallback={<ScheduleSkeleton />}>
            <LoanDetailClient 
              loanId={params.id}
              initialSchedule={initialSchedule}
              initialMetrics={metrics}
            />
          </Suspense>
        </div>
      </Card>
    </div>
  );
}
```

### 4.2 Separate komponenty
**Súbor:** `apps/web/src/components/loans/LoanHeader.tsx`

```typescript
import { Badge } from '@finapp/ui';

interface Props {
  loan: any;
  metrics: any;
}

export function LoanHeader({ loan, metrics }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{loan.lender}</h1>
        <p className="text-muted-foreground">
          {loan.loan_type === 'annuity' && 'Anuitný úver'}
          {loan.loan_type === 'fixed_principal' && 'Fixná istina'}
          {loan.loan_type === 'interest_only' && 'Interest-only'}
        </p>
      </div>
      <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
        {loan.status === 'active' && 'Aktívny'}
        {loan.status === 'paid_off' && 'Splatený'}
        {loan.status === 'defaulted' && 'Defaultný'}
      </Badge>
    </div>
  );
}
```

**Expected výsledok:** Initial render < 500ms, progressive loading

---

## 📊 Fáza 5: Virtualizovaná tabuľka (2h)

### 5.1 VirtualizedScheduleTable komponent
**Súbor:** `apps/web/src/components/loans/VirtualizedScheduleTable.tsx`

```typescript
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo } from 'react';
import { Button } from '@finapp/ui';
import { Loader2 } from 'lucide-react';

interface ScheduleEntry {
  id: string;
  installment_no: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  fees_due: string;
  total_due: string;
  principal_balance_after: string;
  status: string;
}

interface Props {
  schedule: ScheduleEntry[];
  loading?: string | null;
  onPay: (id: string, amount: number) => void;
}

export function VirtualizedScheduleTable({ 
  schedule, 
  loading,
  onPay 
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  // ✅ Memoizované výpočty (raz pri načítaní)
  const enrichedSchedule = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueSoonDate = new Date(today);
    dueSoonDate.setDate(dueSoonDate.getDate() + 7);
    
    return schedule.map(entry => {
      const dueDate = new Date(entry.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      return {
        ...entry,
        dueDate,
        formattedDate: dueDate.toLocaleDateString('sk-SK'),
        isDueSoon: entry.status !== 'paid' && dueDate >= today && dueDate <= dueSoonDate,
        isOverdue: entry.status === 'overdue',
      };
    });
  }, [schedule]);
  
  // Virtualizer - renderuje len viditeľné riadky
  const virtualizer = useVirtualizer({
    count: enrichedSchedule.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // row height in px
    overscan: 15, // render extra rows for smooth scrolling
  });
  
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header - sticky */}
      <div className="bg-muted/50 border-b sticky top-0 z-10">
        <div className="grid grid-cols-9 gap-2 p-2 text-sm font-medium">
          <div>#</div>
          <div>Dátum</div>
          <div className="text-right">Istina</div>
          <div className="text-right">Úrok</div>
          <div className="text-right">Poplatky</div>
          <div className="text-right">Celkom</div>
          <div className="text-right">Zostatok</div>
          <div className="text-center">Status</div>
          <div className="text-center">Akcia</div>
        </div>
      </div>
      
      {/* Virtualized body */}
      <div 
        ref={parentRef} 
        className="h-[600px] overflow-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const entry = enrichedSchedule[virtualRow.index];
            if (!entry) return null;
            
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                className={`absolute top-0 left-0 w-full border-b hover:bg-muted/50 transition-colors ${
                  entry.isOverdue ? 'bg-red-50' : entry.isDueSoon ? 'bg-orange-50' : ''
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="grid grid-cols-9 gap-2 p-2 text-sm items-center h-full">
                  <div>{entry.installment_no}</div>
                  <div>
                    {entry.formattedDate}
                    {entry.isOverdue && (
                      <span className="ml-2 text-xs text-red-600">⚠️</span>
                    )}
                    {entry.isDueSoon && !entry.isOverdue && (
                      <span className="ml-2 text-xs text-orange-600">🔔</span>
                    )}
                  </div>
                  <div className="text-right">
                    {Number(entry.principal_due).toFixed(2)} €
                  </div>
                  <div className="text-right">
                    {Number(entry.interest_due).toFixed(2)} €
                  </div>
                  <div className="text-right">
                    {Number(entry.fees_due).toFixed(2)} €
                  </div>
                  <div className="text-right font-medium">
                    {Number(entry.total_due).toFixed(2)} €
                  </div>
                  <div className="text-right text-muted-foreground">
                    {Number(entry.principal_balance_after).toFixed(2)} €
                  </div>
                  <div className="text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs ${
                        entry.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : entry.status === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {entry.status === 'paid' && 'Zaplatené'}
                      {entry.status === 'overdue' && 'Omeškané'}
                      {entry.status === 'pending' && 'Čaká'}
                    </span>
                  </div>
                  <div className="text-center">
                    {entry.status !== 'paid' && (
                      <Button
                        size="sm"
                        variant={entry.isOverdue ? 'destructive' : 'outline'}
                        onClick={() => onPay(entry.id, Number(entry.total_due))}
                        disabled={loading === entry.id}
                      >
                        {loading === entry.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Uhradiť'
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

### 5.2 Skeleton komponent
**Súbor:** `apps/web/src/components/loans/ScheduleSkeleton.tsx`

```typescript
export function ScheduleSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-10 bg-muted animate-pulse rounded" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted/50 animate-pulse rounded" />
      ))}
    </div>
  );
}
```

**Expected výsledok:** 60 FPS scroll, < 50MB memory

---

## 🔄 Fáza 6: Client component refactor (1.5h)

### 6.1 Refactor LoanDetailClient
**Súbor:** `apps/web/src/app/dashboard/loans/[id]/LoanDetailClient.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@finapp/ui';
import { Loader2 } from 'lucide-react';
import { VirtualizedScheduleTable } from '@/components/loans/VirtualizedScheduleTable';
import {
  useLoanSchedule,
  usePayInstallment,
  useMarkPaidUntilToday,
  useRegenerateSchedule,
} from '@/hooks/useLoansData';

interface Props {
  loanId: string;
  initialSchedule: any[];
  initialMetrics?: any;
}

export function LoanDetailClient({ 
  loanId, 
  initialSchedule,
  initialMetrics 
}: Props) {
  const [page, setPage] = useState(1);
  
  // React Query hooks
  const { data, isLoading } = useLoanSchedule(loanId, page, {
    schedule: initialSchedule,
    count: initialSchedule.length,
    page: 1,
    pages: 1,
    metrics: initialMetrics,
  });
  
  const payMutation = usePayInstallment(loanId);
  const markPaidMutation = useMarkPaidUntilToday(loanId);
  const regenerateMutation = useRegenerateSchedule(loanId);

  const schedule = data?.schedule ?? [];
  const metrics = data?.metrics ?? initialMetrics;

  // Handlers s optimistic updates
  const handlePayInstallment = async (installmentId: string, amount: number) => {
    if (!confirm(`Naozaj chcete uhradiť splátku vo výške ${amount.toFixed(2)} €?`)) {
      return;
    }

    try {
      await payMutation.mutateAsync({ installmentId, amount });
      alert('Splátka bola úspešne uhradená!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Nepodarilo sa uhradiť splátku');
    }
  };

  const handleMarkPaidUntilToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const pendingUntilToday = schedule.filter(
      (entry: any) => 
        (entry.status === 'pending' || entry.status === 'overdue') && 
        entry.due_date <= today
    );

    if (pendingUntilToday.length === 0) {
      alert('Žiadne splátky na označenie.');
      return;
    }

    if (!confirm(`Naozaj chcete označiť ${pendingUntilToday.length} splátok ako uhradené?`)) {
      return;
    }

    try {
      await markPaidMutation.mutateAsync(today);
      alert(`${pendingUntilToday.length} splátok bolo úspešne označených!`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Nepodarilo sa označiť splátky');
    }
  };

  const handleRegenerateSchedule = async () => {
    if (!confirm('Naozaj chcete regenerovať splátkový kalendár?')) {
      return;
    }

    try {
      await regenerateMutation.mutateAsync();
      alert('Splátkový kalendár bol úspešne regenerovaný!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Nepodarilo sa regenerovať kalendár');
    }
  };

  if (isLoading) {
    return <ScheduleSkeleton />;
  }

  return (
    <div className="space-y-4">
      {schedule.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p className="font-medium">Splátkový kalendár nebol vygenerovaný</p>
          <Button
            onClick={handleRegenerateSchedule}
            disabled={regenerateMutation.isPending}
            className="mt-2"
            size="sm"
          >
            {regenerateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generujem...
              </>
            ) : (
              'Vygenerovať kalendár'
            )}
          </Button>
        </div>
      )}

      {schedule.length > 0 && (
        <>
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleMarkPaidUntilToday}
              disabled={markPaidMutation.isPending}
              variant="outline"
              size="sm"
            >
              {markPaidMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Označujem...
                </>
              ) : (
                '📅 Označiť splátky ako uhradené k dnešnému dátumu'
              )}
            </Button>
          </div>
          
          <VirtualizedScheduleTable
            schedule={schedule}
            loading={payMutation.variables?.installmentId}
            onPay={handlePayInstallment}
          />
        </>
      )}
    </div>
  );
}
```

**Expected výsledok:** Clean code, < 150 riadkov, okamžité UI updates

---

## ✅ Fáza 7: Testing & Validation (45 min)

### 7.1 Performance testing
```bash
# Install k6 (load testing)
brew install k6

# Create test script
cat > test-loan-performance.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const loanId = 'YOUR_LOAN_ID';
  const res = http.get(`http://localhost:3000/api/loans/${loanId}/schedule`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
EOF

# Run test
k6 run test-loan-performance.js
```

### 7.2 Funkcionálne testovanie checklist
- [ ] Initial page load < 1s
- [ ] Table scroll 60 FPS
- [ ] Pay installment - optimistic update works
- [ ] Mark paid until today works
- [ ] Regenerate schedule works
- [ ] Pagination works (if implemented)
- [ ] Error handling (network failure)
- [ ] Cache invalidation po mutáciách
- [ ] Browser back/forward funguje
- [ ] React Query Devtools shows correct state

### 7.3 Browser testing
- [ ] Chrome (desktop)
- [ ] Chrome (mobile - DevTools device emulation)
- [ ] Safari (iOS Simulator)
- [ ] Firefox

### 7.4 Lighthouse audit
```bash
# Run Lighthouse
npx lighthouse http://localhost:3000/dashboard/loans/[id] \
  --only-categories=performance \
  --view

# Target scores:
# Performance: > 90
# LCP: < 2.5s
# FID: < 100ms
# CLS: < 0.1
```

---

## 🧹 Fáza 8: Cleanup & Polish (30 min)

### 8.1 TypeScript
```bash
cd apps/web
pnpm typecheck
```

**Fix všetky errors:**
- Chýbajúce typy
- Implicit any
- Unused variables

### 8.2 Linting
```bash
pnpm lint --fix
```

### 8.3 Code cleanup
- [ ] Odstrániť všetky `console.log`
- [ ] Odstrániť commented code
- [ ] Odstrániť unused imports
- [ ] Optimalizovať imports (grouped)

### 8.4 Bundle analysis
```bash
# Add to package.json scripts:
"analyze": "ANALYZE=true next build"

# Run
pnpm analyze
```

---

## 📈 Expected výsledky

### Performance metriky

| Metrika | Pred | Po | Target | Status |
|---------|------|-----|--------|--------|
| **Initial Load** | 8-12s | <1s | ✅ <1s | 🎯 |
| **Loan Detail (360)** | 3-5s | <500ms | ✅ <500ms | 🎯 |
| **Pay Action** | 2s | <150ms | ✅ <200ms | 🎯 |
| **Table Scroll FPS** | 15-25 | 60 | ✅ 60 | 🎯 |
| **Memory Usage** | 500MB+ | <100MB | ✅ <150MB | 🎯 |
| **API Response** | - | <100ms | ✅ <100ms | 🎯 |

### Core Web Vitals

- **LCP** (Largest Contentful Paint): < 2.5s ✅
- **FID** (First Input Delay): < 100ms ✅
- **CLS** (Cumulative Layout Shift): < 0.1 ✅
- **TTFB** (Time to First Byte): < 600ms ✅
- **INP** (Interaction to Next Paint): < 200ms ✅

---

## 🚀 Deployment plán

### 1. Development
```bash
# Create feature branch
git checkout -b feat/loan-performance-optimization

# Implement fázy 0-8

# Commit incrementally
git add .
git commit -m "feat: add database indexes and materialized views"
git commit -m "feat: add React Query setup"
git commit -m "feat: add virtualized table"
# etc...

# Push
git push origin feat/loan-performance-optimization
```

### 2. Preview deployment
- Vercel automaticky vytvorí preview URL
- Test na preview: `https://financie-xxx.vercel.app/dashboard/loans/[id]`
- Sleduj Vercel Analytics

### 3. Production
```bash
# Merge to main
git checkout main
git merge feat/loan-performance-optimization
git push origin main

# Vercel auto-deploy to production
```

### 4. Monitoring (24h)
- [ ] Sleduj Vercel Analytics
- [ ] Sleduj Supabase Dashboard (query performance)
- [ ] Check error rates
- [ ] User feedback

---

## 💾 Backup & Rollback plán

### Pred začatím
```bash
# Backup current version
git checkout -b backup/pre-optimization
git push origin backup/pre-optimization

# Backup DB (Supabase dashboard)
# Projects > Database > Backups > Create backup
```

### Rollback ak treba
```bash
# Revert commits
git checkout main
git revert <commit-hash>
git push origin main

# Alebo hard reset (danger!)
git reset --hard backup/pre-optimization
git push origin main --force

# DB rollback (Supabase)
# Projects > Database > Backups > Restore
```

---

## ⏱️ Časový odhad

| Fáza | Čas | Priorita | Dependencies |
|------|-----|----------|--------------|
| 0. Príprava | 10 min | 🔴 Kritická | - |
| 1. DB optimalizácie | 30 min | 🔴 Kritická | - |
| 2. API Layer | 1.5h | 🔴 Kritická | Fáza 1 |
| 3. React Query | 1h | 🟠 Vysoká | Fáza 0 |
| 4. Server Components | 45 min | 🟠 Vysoká | Fáza 1, 2 |
| 5. Virtualizácia | 2h | 🟠 Vysoká | Fáza 3 |
| 6. Client refactor | 1.5h | 🟡 Stredná | Fáza 3, 5 |
| 7. Testing | 45 min | 🔴 Kritická | Všetky |
| 8. Cleanup | 30 min | 🟠 Vysoká | Všetky |
| **TOTAL** | **~9h** | | |

**Realistický rozvrh:** 2-3 dni (po 3-4h/deň)

---

## 🎯 Success kritériá

### Must Have ✅
- [ ] Initial load < 1s
- [ ] Table scroll 60 FPS
- [ ] Optimistic updates fungujú
- [ ] Žiadne TS/ESLint errors
- [ ] API response < 100ms
- [ ] Cache funguje správne
- [ ] Všetky mutations fungujú
- [ ] Error handling works

### Nice to Have 🎁
- [ ] Prefetching pri hover
- [ ] Keyboard shortcuts (j/k navigation)
- [ ] Export to CSV
- [ ] Advanced filters (status, date range)
- [ ] Column sorting
- [ ] Search v tabuľke

---

## 📚 Ďalšie kroky (budúcnosť)

### Keď budeš mať 5-10k užívateľov:
1. **Redis cache** (Upstash) - $10/mes
2. **Edge functions** pre všetky API endpointy
3. **CDN pre static assets** (Vercel automatic)
4. **Database read replicas** (Supabase Pro+)

### Keď budeš mať 50k+ užívateľov:
1. **Database sharding** (by household_id)
2. **Message queue** (BullMQ + Redis) pre async tasks
3. **Separate analytics DB** (ClickHouse)
4. **GraphQL** (Hasura) namiesto REST

### Monitoring tools (add later):
- **Sentry** - Error tracking ($26/mes)
- **LogRocket** - Session replay ($99/mes)
- **Datadog** - APM monitoring ($15/host/mes)

---

## 💰 Náklady

### Aktuálne (0 extra)
```
Vercel Pro:              $20/mes (už máš)
Supabase Pro:           $25/mes (už máš)
Upstash Redis:           $0 (zatiaľ netreba)
Vercel Analytics:        $0 (included)
--------------------------------
TOTAL:                   $0 extra
```

### Budúcnosť (pri škálovaní)
```
Vercel Pro:              $20/mes
Supabase Pro:           $25/mes
Upstash Redis:          $10/mes (pri 5k+ users)
Sentry:                 $26/mes (optional)
--------------------------------
TOTAL:                  ~$81/mes
```

---

## 📞 Kontakt & Support

Pri problémoch check:
1. **Vercel Logs** - https://vercel.com/dashboard/logs
2. **Supabase Logs** - Dashboard > Logs
3. **React Query Devtools** - Development mode
4. **Browser DevTools** - Network, Performance tab

---

**Autor:** AI Assistant  
**Dátum:** 2024-10-30  
**Verzia:** 1.0  
**Status:** Ready for implementation 🚀

