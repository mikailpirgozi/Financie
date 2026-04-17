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
  onInsuranceChange?: RealtimeCallback;
  onVehicleDocumentChange?: RealtimeCallback;
  onServiceRecordChange?: RealtimeCallback;
  onFineChange?: RealtimeCallback;
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

  // Subscribe to vehicle-domain side tables (insurances, documents, service, fines)
  // → bez nich dashboard alerts a vehicle detail nereagujú na real-time zmeny
  const vehicleDomainTables: Array<{
    table: string;
    handler: keyof RealtimeHandlers;
  }> = [
    { table: 'insurances', handler: 'onInsuranceChange' },
    { table: 'vehicle_documents', handler: 'onVehicleDocumentChange' },
    { table: 'service_records', handler: 'onServiceRecordChange' },
    { table: 'fines', handler: 'onFineChange' },
  ];

  for (const { table, handler } of vehicleDomainTables) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        filter: `household_id=eq.${householdId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const cb = handlers[handler] as RealtimeCallback | undefined;
        cb?.({
          type: (payload.eventType?.toUpperCase() ?? 'UPDATE') as 'INSERT' | 'UPDATE' | 'DELETE',
          new: (payload.new ?? {}) as Record<string, unknown>,
          old: (payload.old ?? {}) as Record<string, unknown>,
        });
      }
    );
  }

  channel.subscribe((status) => {
    // Realtime subscription status - logs disabled for performance
    // Only log errors in development
    if (__DEV__ && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) {
      console.warn(`⚠️ Realtime ${status} for household ${householdId}`);
    }
  });

  return channel;
}

export function cleanupRealtimeSubscriptions(channel: RealtimeChannel | null): void {
  if (channel) {
    supabase.removeChannel(channel);
  }
}

export type DashboardDataType =
  | 'expense'
  | 'income'
  | 'loan'
  | 'asset'
  | 'insurance'
  | 'vehicle_document'
  | 'service_record'
  | 'fine';

export function setupDashboardRealtimeSubscriptions(
  householdId: string,
  onDataChange: (type: DashboardDataType) => void
): RealtimeChannel {
  return setupRealtimeSubscriptions(householdId, {
    onExpenseChange: () => onDataChange('expense'),
    onIncomeChange: () => onDataChange('income'),
    onLoanChange: () => onDataChange('loan'),
    onAssetChange: () => onDataChange('asset'),
    onInsuranceChange: () => onDataChange('insurance'),
    onVehicleDocumentChange: () => onDataChange('vehicle_document'),
    onServiceRecordChange: () => onDataChange('service_record'),
    onFineChange: () => onDataChange('fine'),
  });
}
