import { useQuery } from '@tanstack/react-query';
import { getCurrentHousehold, type Household } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hook: načíta aktuálny household s cachovaním
 * Používa dlhý staleTime pretože household sa mení zriedka
 */
export function useHousehold() {
  return useQuery({
    queryKey: queryKeys.household,
    queryFn: () => getCurrentHousehold(),
    staleTime: 5 * 60 * 1000, // 5 minutes - household sa mení zriedka
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false, // Nerefetchuj pri každom mount
    refetchOnWindowFocus: false,
  });
}

export type { Household };
