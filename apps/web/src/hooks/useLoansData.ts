import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =====================================================
// QUERY: Loan Schedule
// =====================================================
export function useLoanSchedule(
  loanId: string | undefined,
  page = 1,
  initialData?: unknown
) {
  return useQuery({
    queryKey: ['loan-schedule', loanId, page],
    queryFn: async () => {
      if (!loanId) throw new Error('Loan ID is required');
      const res = await fetch(`/api/loans/${loanId}/schedule?page=${page}&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch schedule');
      return res.json();
    },
    initialData,
    enabled: !!loanId,
  });
}

// =====================================================
// QUERY: Loan Metrics
// =====================================================
export function useLoanMetrics(loanId: string | undefined) {
  return useQuery({
    queryKey: ['loan-metrics', loanId],
    queryFn: async () => {
      if (!loanId) throw new Error('Loan ID is required');
      const res = await fetch(`/api/loans/${loanId}/metrics`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    },
    enabled: !!loanId,
  });
}

// =====================================================
// MUTATION: Pay Installment
// =====================================================
interface PayInstallmentData {
  installmentId: string;
  amount: number;
}

interface PayInstallmentResponse {
  success: boolean;
  payment: unknown;
  installment: unknown;
  updatedSchedule: unknown;
}

interface PayInstallmentContext {
  previousData?: unknown;
}

export function usePayInstallment(loanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<
    PayInstallmentResponse,
    Error,
    PayInstallmentData,
    PayInstallmentContext
  >({
    mutationFn: async (data) => {
      if (!loanId) throw new Error('Loan ID is required');
      const res = await fetch(`/api/loans/${loanId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Payment failed');
      }
      return res.json();
    },

    // Optimistic update - okamžitá zmena UI
    onMutate: async ({ installmentId }) => {
      if (!loanId) return {};

      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ['loan-schedule', loanId],
      });

      // Snapshot previous data
      const previousData = queryClient.getQueryData(['loan-schedule', loanId]);

      // Optimistically update
      queryClient.setQueryData(['loan-schedule', loanId], (old: unknown) => {
        if (typeof old !== 'object' || old === null) return old;
        const oldData = old as Record<string, unknown>;
        const schedule = oldData.schedule as Array<Record<string, unknown>>;
        if (!Array.isArray(schedule)) return old;

        return {
          ...oldData,
          schedule: schedule.map((s) =>
            s.id === installmentId
              ? { ...s, status: 'paid', paid_at: new Date().toISOString() }
              : s
          ),
        };
      });

      return { previousData };
    },

    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        if (!loanId) return;
        queryClient.setQueryData(['loan-schedule', loanId], context.previousData);
      }
    },

    onSettled: () => {
      if (!loanId) return;
      // Invalidate to refetch
      queryClient.invalidateQueries({
        queryKey: ['loan-schedule', loanId],
      });
      queryClient.invalidateQueries({
        queryKey: ['loan-metrics', loanId],
      });
    },
  });
}

// =====================================================
// MUTATION: Mark Paid Until Today
// =====================================================
export function useMarkPaidUntilToday(loanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string>({
    mutationFn: async (date) => {
      if (!loanId) throw new Error('Loan ID is required');
      const res = await fetch(`/api/loans/${loanId}/mark-paid-until-today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error('Failed to mark installments');
      return res.json();
    },

    onSuccess: () => {
      if (!loanId) return;
      queryClient.invalidateQueries({ queryKey: ['loan-schedule', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan-metrics', loanId] });
    },
  });
}

// =====================================================
// MUTATION: Regenerate Schedule
// =====================================================
export function useRegenerateSchedule(loanId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, void>({
    mutationFn: async () => {
      if (!loanId) throw new Error('Loan ID is required');
      const res = await fetch(`/api/loans/${loanId}/regenerate-schedule`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to regenerate schedule');
      return res.json();
    },

    onSuccess: () => {
      if (!loanId) return;
      queryClient.invalidateQueries({ queryKey: ['loan-schedule', loanId] });
      queryClient.invalidateQueries({ queryKey: ['loan-metrics', loanId] });
    },
  });
}
