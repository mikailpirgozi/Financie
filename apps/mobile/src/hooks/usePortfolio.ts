import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPortfolioOverview,
  getAssetMetrics,
  getLoanCalendar,
  linkLoanToAsset,
  unlinkLoanFromAsset,
  getAssetCashFlow,
  addAssetCashFlow,
} from '@/lib/api-portfolio';

/**
 * Hook pre získanie prehľadu portfólia
 */
export function usePortfolioOverview(householdId: string) {
  return useQuery({
    queryKey: ['portfolio', 'overview', householdId],
    queryFn: () => getPortfolioOverview(householdId),
    enabled: !!householdId,
    staleTime: 5 * 60 * 1000, // 5 minút
  });
}

/**
 * Hook pre získanie metrik majetku
 */
export function useAssetMetrics(
  assetId: string,
  options?: {
    includeRoi?: boolean;
    roiPeriodMonths?: number;
  }
) {
  return useQuery({
    queryKey: ['asset', 'metrics', assetId, options],
    queryFn: () => getAssetMetrics(assetId, options),
    enabled: !!assetId,
    staleTime: 10 * 60 * 1000, // 10 minút
  });
}

/**
 * Hook pre získanie splátkového kalendára
 */
export function useLoanCalendar(
  householdId: string,
  options?: {
    startMonth?: string;
    monthsCount?: number;
  }
) {
  return useQuery({
    queryKey: ['loans', 'calendar', householdId, options],
    queryFn: () => getLoanCalendar(householdId, options),
    enabled: !!householdId,
    staleTime: 1 * 60 * 1000, // 1 minúta (kalendár sa často mení)
  });
}

/**
 * Hook pre prepojenie úveru s majetkom
 */
export function useLinkLoanToAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ loanId, assetId }: { loanId: string; assetId: string }) =>
      linkLoanToAsset(loanId, assetId),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['asset', 'metrics', variables.assetId] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

/**
 * Hook pre odpojenie úveru od majetku
 */
export function useUnlinkLoanFromAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (loanId: string) => unlinkLoanFromAsset(loanId),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['asset', 'metrics'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

/**
 * Hook pre získanie cash flow histórie majetku
 */
export function useAssetCashFlow(
  assetId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    type?: string;
  }
) {
  return useQuery({
    queryKey: ['asset', 'cashflow', assetId, options],
    queryFn: () => getAssetCashFlow(assetId, options),
    enabled: !!assetId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook pre pridanie cash flow záznamu
 */
export function useAddAssetCashFlow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assetId,
      data,
    }: {
      assetId: string;
      data: {
        date: string;
        type: string;
        amount: number;
        description?: string;
      };
    }) => addAssetCashFlow(assetId, data),
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['asset', 'cashflow', variables.assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset', 'metrics', variables.assetId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });
}

