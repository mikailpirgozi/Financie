'use client';

import { useQuery } from '@tanstack/react-query';
import type { DashboardAlertsResponse } from '@/app/api/dashboard-alerts/route';

interface UseDashboardAlertsOptions {
  householdId: string;
  enabled?: boolean;
}

export function useDashboardAlerts({ householdId, enabled = true }: UseDashboardAlertsOptions) {
  return useQuery<DashboardAlertsResponse>({
    queryKey: ['dashboard-alerts', householdId],
    queryFn: async () => {
      const params = new URLSearchParams({ householdId });
      const response = await fetch(`/api/dashboard-alerts?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard alerts');
      }
      
      return response.json();
    },
    enabled: enabled && !!householdId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime in v4)
    refetchOnWindowFocus: true,
  });
}

// Re-export types for convenience
export type { DashboardAlertsResponse };
export type NextPayment = DashboardAlertsResponse['loans']['nextPayment'];
export type ExpiringDocument = DashboardAlertsResponse['documents']['nearestExpiring'];
