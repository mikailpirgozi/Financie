import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIncomes, deleteIncome, type Income } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';

export function useIncomes(householdId: string | undefined) {
  return useQuery<Income[]>({
    queryKey: householdId ? queryKeys.incomes(householdId) : ['incomes', 'no-household'],
    queryFn: () => getIncomes(householdId as string),
    enabled: !!householdId,
    staleTime: 60 * 1000,
  });
}

export function useDeleteIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteIncome(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-full'] });
    },
  });
}
