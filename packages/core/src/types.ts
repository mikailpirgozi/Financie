// Loan types
export type LoanType = 'annuity' | 'fixed_principal' | 'interest_only' | 'auto_loan' | 'graduated_payment';
export type RateType = 'fixed' | 'variable';
export type DayCountConvention = '30E/360' | 'ACT/360' | 'ACT/365';
export type LoanStatus = 'active' | 'paid_off' | 'defaulted';

// Category types
export type CategoryKind = 'income' | 'expense' | 'loan' | 'asset';

// Asset types
export type AssetKind = 'real_estate' | 'vehicle' | 'business' | 'loan_receivable' | 'bank_account' | 'other';
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

// Vehicle-specific types
export type VehicleBodyType = 'sedan' | 'suv' | 'hatchback' | 'wagon' | 'coupe' | 'van' | 'pickup' | 'other';
export type VehicleFuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'lpg' | 'cng';
export type VehicleTransmission = 'manual' | 'automatic';
export type VehicleDriveType = 'fwd' | 'rwd' | 'awd';

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
  // Graduated payment configuration
  graduatedConfig?: {
    initialPaymentPct: number; // Starting payment as % of standard annuity (e.g., 70 = 70%)
    graduationPeriodMonths: number; // Period over which payments increase (e.g., 60 = 5 years)
    graduationSteps: number; // Number of payment increases (e.g., 5 = increase every year for 5 years)
  };
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

// ============================================
// VEHICLE TYPES
// ============================================

/** Base asset interface */
export interface Asset {
  id: string;
  householdId: string;
  kind: AssetKind;
  name: string;
  acquisitionValue: number;
  currentValue: number;
  acquisitionDate: Date | string;
  isIncomeGenerating?: boolean;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  assetStatus?: AssetStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/** Vehicle-specific asset */
export interface Vehicle extends Asset {
  kind: 'vehicle';
  // Identifikácia
  licensePlate?: string;
  vin?: string;
  // Vlastníctvo
  registeredCompany?: string;
  // Technické údaje
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  bodyType?: VehicleBodyType;
  fuelType?: VehicleFuelType;
  engineCapacity?: number;
  enginePower?: number;
  transmission?: VehicleTransmission;
  driveType?: VehicleDriveType;
  mileage?: number;
  seats?: number;
  doors?: number;
}

/** Vehicle with all linked data summary */
export interface VehicleSummary extends Vehicle {
  // Loan summary
  loanCount: number;
  totalLoanPaid: number;
  totalLoanBalance: number;
  // Insurance summary
  insuranceCount: number;
  activeInsuranceCount: number;
  totalInsuranceCost: number;
  nearestInsuranceExpiry?: string;
  // Document summary (STK, EK, vignettes)
  documentCount: number;
  validDocumentCount: number;
  totalDocumentCost: number;
  stkExpiry?: string;
  ekExpiry?: string;
  // Service summary
  serviceCount: number;
  totalServiceCost: number;
  lastServiceDate?: string;
  lastServiceKm?: number;
  // Fines summary
  fineCount: number;
  unpaidFineCount: number;
  totalFineAmount: number;
  unpaidFineAmount: number;
  // TCO
  totalCostOfOwnership: number;
  // Alerts
  stkExpiringSoon: boolean;
  ekExpiringSoon: boolean;
  insuranceExpiringSoon: boolean;
}

/** Vehicle list stats */
export interface VehicleStats {
  totalCount: number;
  totalValue: number;
  totalAcquisitionValue: number;
  expiringSoonCount: number; // Vehicles with expiring docs/insurance
  withActiveLoansCount: number;
  totalLoanBalance: number;
  totalTco: number;
}

/** Linked items to a vehicle */
export interface VehicleLinkedItems {
  loans: {
    id: string;
    name?: string;
    lender: string;
    principal: number;
    currentBalance: number;
    monthlyPayment: number;
    status: LoanStatus;
  }[];
  insurances: {
    id: string;
    type: string;
    policyNumber: string;
    company?: string;
    validTo: string;
    price: number;
    isActive: boolean;
  }[];
  documents: {
    id: string;
    documentType: string;
    validTo: string;
    price?: number;
    isValid: boolean;
  }[];
  serviceRecords: {
    id: string;
    serviceDate: string;
    serviceType?: string;
    price?: number;
    kmState?: number;
    description?: string;
  }[];
  fines: {
    id: string;
    fineDate: string;
    fineAmount: number;
    isPaid: boolean;
    description?: string;
  }[];
}

/** Full vehicle detail with all linked items */
export interface VehicleDetail extends VehicleSummary {
  linkedItems: VehicleLinkedItems;
}

