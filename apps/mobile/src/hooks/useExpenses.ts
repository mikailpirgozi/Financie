import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getExpenses, deleteExpense, type Expense } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

/**
 * Hook: nacitaj zoznam vydavkov pre dany household.
 * Refresh: cez `refetch()` (pull-to-refresh) alebo invalidacie po mutaciach.
 */
export function useExpenses(householdId: string | undefined) {
  return useQuery<Expense[]>({
    queryKey: householdId ? queryKeys.expenses(householdId) : ['expenses', 'no-household'],
    queryFn: () => getExpenses(householdId as string),
    enabled: !!householdId,
    staleTime: 60 * 1000,
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-full'] });
    },
  });
}
