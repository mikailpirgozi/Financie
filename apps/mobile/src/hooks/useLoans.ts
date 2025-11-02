import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getLoans, 
  getLoan, 
  createLoan,
  markLoanInstallmentPaid,
  markLoanPaidUntilToday,
  type Loan,
  type CreateLoanData,
} from '../lib/api';
import { queryKeys, invalidateDashboard } from '../lib/queryClient';

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
    onSuccess: (response, variables) => {
      // Invalidate loans list
      queryClient.invalidateQueries({ 
        queryKey: ['loans'],
      });
      
      // Invalidate dashboard (loan balance changed)
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'],
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
    onSuccess: (response, variables) => {
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
    onSuccess: (response, variables) => {
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

