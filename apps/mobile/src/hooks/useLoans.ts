import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getLoans, 
  getLoan, 
  createLoan,
  payLoan,
  markLoanInstallmentPaid,
  markLoanPaidUntilToday,
  type CreateLoanData,
} from '../lib/api';
import { queryKeys } from '../lib/queryClient';

/**
 * Hook: načíta zoznam úverov
 */
export function useLoans(householdId: string) {
  return useQuery({
    queryKey: queryKeys.loans(householdId),
    queryFn: () => getLoans(householdId),
    enabled: !!householdId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook: načíta detail úveru + schedule
 */
export function useLoan(loanId: string) {
  return useQuery({
    queryKey: queryKeys.loan(loanId),
    queryFn: () => getLoan(loanId),
    enabled: !!loanId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook: vytvorenie nového úveru
 */
export function useCreateLoan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateLoanData) => createLoan(data),
    onSuccess: (_response, variables) => {
      // Invalidate loans list for this household
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.loans(variables.householdId),
      });
      
      // Invalidate all loans list
      queryClient.invalidateQueries({ 
        queryKey: ['loans'],
      });
      
      // Invalidate dashboard (loan balance changed)
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
      });
      
      // Invalidate dashboard full
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard-full'],
      });
    },
  });
}

/**
 * Hook: zaplatenie splátky úveru s optimistic update
 */
export function usePayLoan() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ loanId, installmentId, amount, date }: {
      loanId: string;
      installmentId: string;
      amount: number;
      date: string;
    }) => payLoan(loanId, installmentId, amount, date),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.loan(variables.loanId) });
      
      // Snapshot the previous value
      const previousLoan = queryClient.getQueryData(queryKeys.loan(variables.loanId));
      
      // Optimistic update - update remaining balance immediately
      queryClient.setQueryData(queryKeys.loan(variables.loanId), (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const oldData = old as { loan?: { remaining_balance?: string } };
        return {
          ...oldData,
          loan: {
            ...oldData.loan,
            remaining_balance: String(
              Math.max(0, parseFloat(String(oldData.loan?.remaining_balance || '0')) - variables.amount)
            ),
          },
        };
      });
      
      return { previousLoan };
    },
    onError: (_err, variables, context) => {
      // Rollback on error
      if (context?.previousLoan) {
        queryClient.setQueryData(queryKeys.loan(variables.loanId), context.previousLoan);
      }
    },
    onSuccess: (_response, variables) => {
      // Invalidate all related queries to refetch fresh data
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.loan(variables.loanId),
      });
      queryClient.invalidateQueries({ 
        queryKey: ['loans'],
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
      });
      queryClient.invalidateQueries({ 
        queryKey: ['overdue'],
      });
      queryClient.invalidateQueries({ 
        queryKey: ['expenses'],
      });
    },
  });
}

/**
 * Hook: označenie splátky ako zaplatenej
 */
export function useMarkInstallmentPaid() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ loanId, installmentId }: { loanId: string; installmentId: string }) =>
      markLoanInstallmentPaid(loanId, installmentId),
    onSuccess: (_response, variables) => {
      // Invalidate loan detail
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.loan(variables.loanId),
      });
      
      // Invalidate loans list
      queryClient.invalidateQueries({ 
        queryKey: ['loans'],
      });
      
      // Invalidate dashboard
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
      });
      queryClient.invalidateQueries({ 
        queryKey: ['overdue'],
      });
    },
  });
}

/**
 * Hook: označenie všetkých splátok po dnes ako zaplatených
 */
export function useMarkPaidUntilToday() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ loanId, date }: { loanId: string; date: string }) =>
      markLoanPaidUntilToday(loanId, date),
    onSuccess: (_response, variables) => {
      // Invalidate loan detail
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.loan(variables.loanId),
      });
      
      // Invalidate loans list
      queryClient.invalidateQueries({ 
        queryKey: ['loans'],
      });
      
      // Invalidate dashboard
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
      });
      queryClient.invalidateQueries({ 
        queryKey: ['overdue'],
      });
    },
  });
}

