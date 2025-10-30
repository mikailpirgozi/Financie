// Loan types
export type LoanType = 'annuity' | 'fixed_principal' | 'interest_only' | 'auto_loan';
export type RateType = 'fixed' | 'variable';
export type DayCountConvention = '30E/360' | 'ACT/360' | 'ACT/365';
export type LoanStatus = 'active' | 'paid_off' | 'defaulted';

// Category types
export type CategoryKind = 'income' | 'expense' | 'loan' | 'asset';

// Asset types
export type AssetKind = 'real_estate' | 'vehicle' | 'business' | 'loan_receivable' | 'other';

// Household member roles
export type HouseholdRole = 'owner' | 'member';

// Payment status
export type PaymentStatus = 'pending' | 'paid' | 'overdue';

// Loan schedule entry
export interface LoanScheduleEntry {
  installmentNo: number;
  dueDate: Date;
  principalDue: number;
  interestDue: number;
  feesDue: number;
  totalDue: number;
  principalBalanceAfter: number;
  status: PaymentStatus;
}

// Loan calculation input
export interface LoanCalculationInput {
  loanType: LoanType;
  principal: number;
  annualRate: number;
  termMonths: number;
  startDate: Date;
  dayCountConvention: DayCountConvention;
  feeSetup?: number;
  feeMonthly?: number;
  insuranceMonthly?: number;
  balloonAmount?: number;
  fixedMonthlyPayment?: number; // For annuity: use this exact payment instead of calculating
  fixedPrincipalPayment?: number; // For fixed_principal: use this exact principal payment instead of calculating
}

// Loan calculation result
export interface LoanCalculationResult {
  schedule: LoanScheduleEntry[];
  totalInterest: number;
  totalFees: number;
  totalPayment: number;
  effectiveRate: number; // RPMN
}

// Monthly summary
export interface MonthlySummary {
  month: string; // YYYY-MM
  incomesTotal: number;
  expensesTotal: number;
  loanPrincipalPaid: number;
  loanInterestPaid: number;
  loanFeesPaid: number;
  loansBalance: number;
  netWorth: number;
}

// Asset valuation
export interface AssetValuation {
  date: Date;
  value: number;
  source: 'manual' | 'automatic';
}

// Rule for automatic categorization
export interface CategorizationRule {
  matchType: 'contains' | 'exact' | 'starts_with' | 'ends_with';
  matchValue: string;
  categoryId: string;
  applyTo: 'expense' | 'income';
}

// Early repayment calculation input
export interface EarlyRepaymentCalculationInput {
  loanType: LoanType;
  principal: number;
  annualRate: number;
  termMonths: number;
  startDate: Date;
  dayCountConvention: DayCountConvention;
  feeSetup?: number;
  feeMonthly?: number;
  insuranceMonthly?: number;
  balloonAmount?: number;
  currentInstallment: number; // Which installment we're at
  repaymentAmount: number; // How much to pay early
  penaltyPct: number; // Early repayment penalty percentage
}

// Early repayment result
export interface EarlyRepaymentResult {
  penaltyAmount: number;
  remainingBalance: number;
  newSchedule: LoanScheduleEntry[];
  totalSaved: number; // Interest + fees saved
  effectiveRate: number;
}

// Loan simulation input
export interface LoanSimulationInput {
  loanType: LoanType;
  principal: number;
  annualRate: number;
  termMonths: number;
  startDate: Date;
  dayCountConvention: DayCountConvention;
  feeSetup?: number;
  feeMonthly?: number;
  insuranceMonthly?: number;
  balloonAmount?: number;
  scenarios: SimulationScenario[];
}

// Simulation scenario
export interface SimulationScenario {
  name: string;
  extraPaymentMonthly?: number; // Extra payment each month
  extraPaymentOneTime?: {
    installmentNo: number;
    amount: number;
  }[];
  rateChange?: {
    fromInstallment: number;
    newRate: number;
  };
}

// Simulation result
export interface SimulationResult {
  scenario: string;
  schedule: LoanScheduleEntry[];
  totalInterest: number;
  totalFees: number;
  totalPayment: number;
  effectiveRate: number;
  monthsSaved: number;
  totalSaved: number;
}

// Loan comparison result
export interface LoanComparisonResult {
  scenarios: SimulationResult[];
  bestScenario: string;
  comparison: {
    totalInterestRange: { min: number; max: number };
    totalPaymentRange: { min: number; max: number };
    monthsSavedRange: { min: number; max: number };
  };
}

