// Loan types
export type LoanType = 'annuity' | 'fixed_principal' | 'interest_only' | 'auto_loan';
export type RateType = 'fixed' | 'variable';
export type DayCountConvention = '30E/360' | 'ACT/360' | 'ACT/365';
export type LoanStatus = 'active' | 'paid_off' | 'defaulted';

// Category types
export type CategoryKind = 'income' | 'expense' | 'loan' | 'asset';

// Asset types
export type AssetKind = 'real_estate' | 'vehicle' | 'business' | 'loan_receivable' | 'other';
export type AssetStatus = 'owned' | 'rented_out' | 'for_sale' | 'sold';
export type AssetCashFlowType = 
  | 'rental_income' 
  | 'dividend' 
  | 'interest' 
  | 'sale_income' 
  | 'expense' 
  | 'maintenance' 
  | 'tax' 
  | 'insurance' 
  | 'other';

// Loan purpose types
export type LoanPurpose = 
  | 'property_purchase' 
  | 'vehicle_purchase' 
  | 'business_loan' 
  | 'consumer_loan' 
  | 'refinancing' 
  | 'other';

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

// Portfolio Management Types
export interface AssetCashFlow {
  id: string;
  assetId: string;
  date: Date;
  type: AssetCashFlowType;
  amount: number;
  description?: string;
  createdAt: Date;
}

export interface AssetLoanMetrics {
  id: string;
  assetId: string;
  loanId?: string;
  calculationDate: Date;
  assetValue: number;
  loanBalance: number;
  equity: number;
  ltvRatio: number;
}

export interface AssetROI {
  cashFlowRoi: number; // Anualizovaný ROI z cash flow
  appreciationRoi: number; // ROI zo zhodnotenia
  totalRoi: number; // Celkový ROI
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  currentValue: number;
  acquisitionValue: number;
  valueChange: number;
}

export interface PortfolioOverview {
  householdId: string;
  
  // Assets
  totalAssetsValue: number;
  productiveAssetsValue: number;
  nonProductiveAssetsValue: number;
  totalAssetsCount: number;
  productiveAssetsCount: number;
  
  // Cash flow
  monthlyIncomeFromAssets: number;
  monthlyExpensesFromAssets: number;
  netCashFlowFromAssets: number;
  
  // Loans
  totalLoansCount: number;
  totalOriginalPrincipal: number;
  totalDebt: number;
  nextMonthLoanPayment: number;
  
  // Portfolio metrics
  netWorth: number;
  debtToAssetRatio: number;
  totalMonthlyCashFlow: number;
}

export interface AssetWithMetrics {
  id: string;
  householdId: string;
  kind: AssetKind;
  name: string;
  acquisitionValue: number;
  currentValue: number;
  acquisitionDate: Date;
  isIncomeGenerating: boolean;
  monthlyIncome: number;
  monthlyExpenses: number;
  assetStatus: AssetStatus;
  
  // Prepojený úver
  linkedLoan?: {
    id: string;
    lender: string;
    currentBalance: number;
    monthlyPayment: number;
  };
  
  // Metriky
  metrics?: {
    ltvRatio: number;
    equity: number;
    netMonthlyCashFlow: number;
  };
  
  // ROI
  roi?: AssetROI;
}

export interface LoanCalendarEntry {
  loanId: string;
  loanName: string;
  lender: string;
  linkedAssetId?: string;
  linkedAssetName?: string;
  dueDate: Date;
  installmentNo: number;
  principalDue: number;
  interestDue: number;
  feesDue: number;
  totalDue: number;
  status: PaymentStatus;
  loanType: LoanType;
}

export interface MonthlyLoanCalendar {
  month: string; // YYYY-MM
  totalPayments: number;
  totalPrincipal: number;
  totalInterest: number;
  totalFees: number;
  entries: LoanCalendarEntry[];
}

