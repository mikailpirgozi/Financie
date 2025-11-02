import { supabase } from './supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface RealtimePayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

export type RealtimeCallback = (payload: RealtimePayload) => void;

export interface RealtimeHandlers {
  onExpenseChange?: RealtimeCallback;
  onIncomeChange?: RealtimeCallback;
  onLoanChange?: RealtimeCallback;
  onAssetChange?: RealtimeCallback;
}

export function setupRealtimeSubscriptions(
  householdId: string,
  handlers: RealtimeHandlers
): RealtimeChannel {
  const channel = supabase.channel(`household-${householdId}`, {
    config: {
      broadcast: { self: true },
      presence: { key: householdId },
    },
  });

  // Subscribe to expense changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'expenses',
      filter: `household_id=eq.${householdId}`,
    },
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      handlers.onExpenseChange?.({
        type: (payload.eventType?.toUpperCase() ?? 'UPDATE') as 'INSERT' | 'UPDATE' | 'DELETE',
        new: (payload.new ?? {}) as Record<string, unknown>,
        old: (payload.old ?? {}) as Record<string, unknown>,
      });
    }
  );

  // Subscribe to income changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'incomes',
      filter: `household_id=eq.${householdId}`,
    },
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      handlers.onIncomeChange?.({
        type: (payload.eventType?.toUpperCase() ?? 'UPDATE') as 'INSERT' | 'UPDATE' | 'DELETE',
        new: (payload.new ?? {}) as Record<string, unknown>,
        old: (payload.old ?? {}) as Record<string, unknown>,
      });
    }
  );

  // Subscribe to loan changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'loans',
      filter: `household_id=eq.${householdId}`,
    },
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      handlers.onLoanChange?.({
        type: (payload.eventType?.toUpperCase() ?? 'UPDATE') as 'INSERT' | 'UPDATE' | 'DELETE',
        new: (payload.new ?? {}) as Record<string, unknown>,
        old: (payload.old ?? {}) as Record<string, unknown>,
      });
    }
  );

  // Subscribe to asset changes
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'assets',
      filter: `household_id=eq.${householdId}`,
    },
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      handlers.onAssetChange?.({
        type: (payload.eventType?.toUpperCase() ?? 'UPDATE') as 'INSERT' | 'UPDATE' | 'DELETE',
        new: (payload.new ?? {}) as Record<string, unknown>,
        old: (payload.old ?? {}) as Record<string, unknown>,
      });
    }
  );

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log(`✅ Realtime subscriptions active for household ${householdId}`);
    } else if (status === 'CHANNEL_ERROR') {
      console.warn(`⚠️ Realtime subscription error for household ${householdId} - this may be due to RLS policies. Realtime will still work via polling.`);
    } else if (status === 'TIMED_OUT') {
      console.warn(`⏱️ Realtime subscription timed out for household ${householdId}`);
    }
  });

  return channel;
}

export function cleanupRealtimeSubscriptions(channel: RealtimeChannel | null): void {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

export function setupDashboardRealtimeSubscriptions(
  householdId: string,
  onDataChange: (type: 'expense' | 'income' | 'loan' | 'asset') => void
): RealtimeChannel {
  return setupRealtimeSubscriptions(householdId, {
    onExpenseChange: () => onDataChange('expense'),
    onIncomeChange: () => onDataChange('income'),
    onLoanChange: () => onDataChange('loan'),
    onAssetChange: () => onDataChange('asset'),
  });
}
