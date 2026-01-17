export { useDebounce } from './useDebounce';
export { useBiometricAuth } from './useBiometricAuth';
export type { BiometricAuthState, StoredCredentials } from './useBiometricAuth';

// Loan hooks
export { 
  useLoans, 
  useLoan, 
  useCreateLoan, 
  usePayLoan, 
  useMarkInstallmentPaid, 
  useMarkPaidUntilToday 
} from './useLoans';

// Document hooks
export {
  useInsurances,
  useVehicleDocuments,
  useServiceRecords,
  useFines,
  useInsurers,
  useAllDocuments,
} from './useDocuments';

// Vehicle hooks
export { useVehicles, useVehicle } from './useVehicles';

// Dashboard hooks
export { useDashboardAlerts, type DashboardAlertsData } from './useDashboardAlerts';
