import { supabase } from './supabase';

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
): any {
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
    (payload: any) => {
      handlers.onExpenseChange?.({
        type: payload.eventType.toUpperCase() as any,
        new: payload.new || {},
        old: payload.old || {},
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
    (payload: any) => {
      handlers.onIncomeChange?.({
        type: payload.eventType.toUpperCase() as any,
        new: payload.new || {},
        old: payload.old || {},
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
    (payload: any) => {
      handlers.onLoanChange?.({
        type: payload.eventType.toUpperCase() as any,
        new: payload.new || {},
        old: payload.old || {},
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
    (payload: any) => {
      handlers.onAssetChange?.({
        type: payload.eventType.toUpperCase() as any,
        new: payload.new || {},
        old: payload.old || {},
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

export function cleanupRealtimeSubscriptions(channel: any): void {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

export function setupDashboardRealtimeSubscriptions(
  householdId: string,
  onDataChange: (type: 'expense' | 'income' | 'loan' | 'asset') => void
): any {
  return setupRealtimeSubscriptions(householdId, {
    onExpenseChange: () => onDataChange('expense'),
    onIncomeChange: () => onDataChange('income'),
    onLoanChange: () => onDataChange('loan'),
    onAssetChange: () => onDataChange('asset'),
  });
}
