import { useState, useEffect, useCallback } from 'react';
import type { DashboardData } from '@finapp/core';

interface UseDashboardOptions {
  householdId: string;
  monthsCount?: number;
}

interface UseDashboardResult {
  data: DashboardData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDashboard({ householdId, monthsCount = 12 }: UseDashboardOptions): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!householdId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        householdId,
        monthsCount: monthsCount.toString(),
      });

      const response = await fetch(`/api/dashboard?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [householdId, monthsCount]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}
