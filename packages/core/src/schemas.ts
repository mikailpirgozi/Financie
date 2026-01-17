import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid();
export const dateSchema = z.coerce.date();
export const positiveNumberSchema = z.number().positive();
export const nonNegativeNumberSchema = z.number().nonnegative();
export const percentageSchema = z.number().min(0).max(100);

// Loan schemas
export const loanTypeSchema = z.enum(['annuity', 'fixed_principal', 'interest_only', 'auto_loan', 'graduated_payment']);
export const rateTypeSchema = z.enum(['fixed', 'variable']);
export const dayCountConventionSchema = z.enum(['30E/360', 'ACT/360', 'ACT/365']);
export const loanStatusSchema = z.enum(['active', 'paid_off', 'defaulted']);
export const loanPurposeSchema = z.enum([
  'property_purchase', 
  'vehicle_purchase', 
  'business_loan', 
  'consumer_loan', 
  'refinancing', 
  'other'
]);

/**
 * Schema for graduated payment configuration
 */
export const graduatedConfigSchema = z.object({
  initialPaymentPct: z.number().min(50).max(99), // Start at 50-99% of standard payment
  graduationPeriodMonths: z.number().int().min(12).max(120), // 1-10 years graduation period
  graduationSteps: z.number().int().min(1).max(10), // 1-10 steps
});

/**
 * Schema for loan calculation input
 * Used by the loan calculator engine
 * 
 * Supports:
 * - annualRate: 0-200% (0% is valid for interest-free loans, high rates for payday loans)
 * - termMonths: 1-600 months (up to 50 years)
 * - All day count conventions (30E/360, ACT/360, ACT/365)
 * - All loan types including graduated payment
 */
export const loanCalculationInputSchema = z.object({
  loanType: loanTypeSchema,
  principal: positiveNumberSchema,
  annualRate: z.number().min(0).max(200), // Allow up to 200% for payday loans
  termMonths: z.number().int().min(1).max(600), // 1 month to 50 years
  startDate: dateSchema,
  dayCountConvention: dayCountConventionSchema,
  feeSetup: nonNegativeNumberSchema.optional(),
  feeMonthly: nonNegativeNumberSchema.optional(),
  insuranceMonthly: nonNegativeNumberSchema.optional(),
  balloonAmount: nonNegativeNumberSchema.optional(),
  fixedMonthlyPayment: positiveNumberSchema.optional(),
  fixedPrincipalPayment: positiveNumberSchema.optional(),
  graduatedConfig: graduatedConfigSchema.optional(),
}).refine(
  (data) => {
    // For interest_only, balloonAmount should not exceed principal + 50%
    if (data.loanType === 'interest_only' && data.balloonAmount !== undefined) {
      return data.balloonAmount <= data.principal * 1.5;
    }
    return true;
  },
  { message: 'Balloon amount should not exceed 150% of principal' }
).refine(
  (data) => {
    // For graduated_payment, graduation period should not exceed term
    if (data.loanType === 'graduated_payment' && data.graduatedConfig) {
      return data.graduatedConfig.graduationPeriodMonths < data.termMonths;
    }
    return true;
  },
  { message: 'Graduation period must be less than loan term' }
);

export const createLoanSchema = z.object({
  householdId: uuidSchema,
  name: z.string().max(200).optional(),
  lender: z.string().min(1).max(200),
  loanType: loanTypeSchema,
  principal: positiveNumberSchema,
  annualRate: percentageSchema,
  rateType: rateTypeSchema.default('fixed'),
  dayCountConvention: dayCountConventionSchema.default('30E/360'),
  startDate: dateSchema,
  termMonths: z.number().int().positive(),
  balloonAmount: nonNegativeNumberSchema.optional(),
  feeSetup: nonNegativeNumberSchema.optional(),
  feeMonthly: nonNegativeNumberSchema.optional(),
  insuranceMonthly: nonNegativeNumberSchema.optional(),
  earlyRepaymentPenaltyPct: percentageSchema.optional(),
  fixedMonthlyPayment: positiveNumberSchema.optional(),
  fixedPrincipalPayment: positiveNumberSchema.optional(),
  linkedAssetId: uuidSchema.optional(),
  loanPurpose: loanPurposeSchema.optional(),
});

export const payLoanSchema = z.object({
  loanId: uuidSchema,
  amount: positiveNumberSchema,
  date: dateSchema,
  note: z.string().max(500).optional(),
});

export const earlyRepaymentSchema = z.object({
  loanId: uuidSchema,
  amount: positiveNumberSchema,
  date: dateSchema,
});

// Expense schemas
export const createExpenseSchema = z.object({
  householdId: uuidSchema,
  date: dateSchema,
  amount: positiveNumberSchema,
  categoryId: uuidSchema,
  merchant: z.string().max(200).optional(),
  note: z.string().max(500).optional(),
});

// Income schemas
export const createIncomeSchema = z.object({
  householdId: uuidSchema,
  date: dateSchema,
  amount: positiveNumberSchema,
  source: z.string().min(1).max(200),
  categoryId: uuidSchema,
  note: z.string().max(500).optional(),
  incomeTemplateId: uuidSchema.optional(),
});

// Income template schemas
export const createIncomeTemplateSchema = z.object({
  householdId: uuidSchema,
  name: z.string().min(1).max(200),
  categoryId: uuidSchema,
  defaultAmount: positiveNumberSchema.optional(),
  note: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().default(0),
});

export const updateIncomeTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  categoryId: uuidSchema.optional(),
  defaultAmount: positiveNumberSchema.nullable().optional(),
  note: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const createIncomeFromTemplateSchema = z.object({
  templateId: uuidSchema,
  date: dateSchema,
  amount: positiveNumberSchema,
  note: z.string().max(500).optional(),
});

// Asset schemas
export const assetKindSchema = z.enum(['real_estate', 'vehicle', 'business', 'loan_receivable', 'bank_account', 'other']);
export const assetStatusSchema = z.enum(['owned', 'rented_out', 'for_sale', 'sold']);
export const assetCashFlowTypeSchema = z.enum([
  'rental_income', 
  'dividend', 
  'interest', 
  'sale_income', 
  'expense', 
  'maintenance', 
  'tax', 
  'insurance', 
  'other'
]);

// Vehicle-specific schemas
export const vehicleBodyTypeSchema = z.enum(['sedan', 'suv', 'hatchback', 'wagon', 'coupe', 'van', 'pickup', 'other']);
export const vehicleFuelTypeSchema = z.enum(['petrol', 'diesel', 'electric', 'hybrid', 'lpg', 'cng']);
export const vehicleTransmissionSchema = z.enum(['manual', 'automatic']);
export const vehicleDriveTypeSchema = z.enum(['fwd', 'rwd', 'awd']);

export const createAssetSchema = z.object({
  householdId: uuidSchema,
  kind: assetKindSchema,
  name: z.string().min(1).max(200),
  acquisitionValue: positiveNumberSchema,
  currentValue: positiveNumberSchema,
  acquisitionDate: dateSchema,
  isIncomeGenerating: z.boolean().default(false),
  monthlyIncome: nonNegativeNumberSchema.default(0),
  monthlyExpenses: nonNegativeNumberSchema.default(0),
  assetStatus: assetStatusSchema.default('owned'),
  indexRule: z.object({
    enabled: z.boolean(),
    annualPercentage: z.number().min(-100).max(100),
  }).optional(),
});

export const updateAssetValueSchema = z.object({
  assetId: uuidSchema,
  value: positiveNumberSchema,
  date: dateSchema,
  source: z.enum(['manual', 'automatic']).default('manual'),
});

// Asset cash flow schemas
export const createAssetCashFlowSchema = z.object({
  assetId: uuidSchema,
  date: dateSchema,
  type: assetCashFlowTypeSchema,
  amount: positiveNumberSchema,
  description: z.string().max(500).optional(),
});

export const updateAssetCashFlowSchema = z.object({
  date: dateSchema.optional(),
  type: assetCashFlowTypeSchema.optional(),
  amount: positiveNumberSchema.optional(),
  description: z.string().max(500).nullable().optional(),
});

// Portfolio schemas
export const getPortfolioOverviewSchema = z.object({
  householdId: uuidSchema,
});

export const getAssetMetricsSchema = z.object({
  assetId: uuidSchema,
  includeRoi: z.boolean().default(true),
  roiPeriodMonths: z.number().int().positive().default(12),
});

export const getLoanCalendarSchema = z.object({
  householdId: uuidSchema,
  startMonth: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  monthsCount: z.number().int().positive().max(360).default(6),
});

export const linkLoanToAssetSchema = z.object({
  loanId: uuidSchema,
  assetId: uuidSchema,
});

// Vehicle schemas
export const createVehicleSchema = z.object({
  householdId: uuidSchema,
  name: z.string().min(1).max(200),
  acquisitionValue: positiveNumberSchema,
  currentValue: positiveNumberSchema,
  acquisitionDate: dateSchema,
  // Identifikácia
  licensePlate: z.string().max(20).optional(),
  vin: z.string().max(17).optional(),
  // Vlastníctvo
  registeredCompany: z.string().max(200).optional(),
  // Technické údaje
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  color: z.string().max(50).optional(),
  bodyType: vehicleBodyTypeSchema.optional(),
  fuelType: vehicleFuelTypeSchema.optional(),
  engineCapacity: z.number().int().positive().optional(),
  enginePower: z.number().int().positive().optional(),
  transmission: vehicleTransmissionSchema.optional(),
  driveType: vehicleDriveTypeSchema.optional(),
  mileage: z.number().int().nonnegative().optional(),
  seats: z.number().int().min(1).max(50).optional(),
  doors: z.number().int().min(1).max(10).optional(),
  // Optional portfolio fields
  isIncomeGenerating: z.boolean().default(false),
  monthlyIncome: nonNegativeNumberSchema.default(0),
  monthlyExpenses: nonNegativeNumberSchema.default(0),
  assetStatus: assetStatusSchema.default('owned'),
});

export const updateVehicleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  currentValue: positiveNumberSchema.optional(),
  // Identifikácia
  licensePlate: z.string().max(20).nullable().optional(),
  vin: z.string().max(17).nullable().optional(),
  // Vlastníctvo
  registeredCompany: z.string().max(200).nullable().optional(),
  // Technické údaje
  make: z.string().max(100).nullable().optional(),
  model: z.string().max(100).nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  bodyType: vehicleBodyTypeSchema.nullable().optional(),
  fuelType: vehicleFuelTypeSchema.nullable().optional(),
  engineCapacity: z.number().int().positive().nullable().optional(),
  enginePower: z.number().int().positive().nullable().optional(),
  transmission: vehicleTransmissionSchema.nullable().optional(),
  driveType: vehicleDriveTypeSchema.nullable().optional(),
  mileage: z.number().int().nonnegative().nullable().optional(),
  seats: z.number().int().min(1).max(50).nullable().optional(),
  doors: z.number().int().min(1).max(10).nullable().optional(),
  // Portfolio fields
  isIncomeGenerating: z.boolean().optional(),
  monthlyIncome: nonNegativeNumberSchema.optional(),
  monthlyExpenses: nonNegativeNumberSchema.optional(),
  assetStatus: assetStatusSchema.optional(),
});

export const linkToVehicleSchema = z.object({
  vehicleId: uuidSchema,
  loanIds: z.array(uuidSchema).optional(),
  insuranceIds: z.array(uuidSchema).optional(),
  documentIds: z.array(uuidSchema).optional(),
  serviceRecordIds: z.array(uuidSchema).optional(),
  fineIds: z.array(uuidSchema).optional(),
});

export const getVehiclesQuerySchema = z.object({
  householdId: uuidSchema,
  registeredCompany: z.string().optional(),
  make: z.string().optional(),
  year: z.number().int().optional(),
  search: z.string().optional(),
});

// Category schemas
export const categoryKindSchema = z.enum(['income', 'expense', 'loan', 'asset']);

export const createCategorySchema = z.object({
  householdId: uuidSchema,
  kind: categoryKindSchema,
  name: z.string().min(1).max(100),
  parentId: uuidSchema.optional(),
});

// Rule schemas
export const matchTypeSchema = z.enum(['contains', 'exact', 'starts_with', 'ends_with']);

export const createRuleSchema = z.object({
  householdId: uuidSchema,
  matchType: matchTypeSchema,
  matchValue: z.string().min(1).max(200),
  categoryId: uuidSchema,
  applyTo: z.enum(['expense', 'income']),
});

// Household schemas
export const createHouseholdSchema = z.object({
  name: z.string().min(1).max(200),
});

export const inviteToHouseholdSchema = z.object({
  householdId: uuidSchema,
  email: z.string().email(),
  role: z.enum(['owner', 'member']).default('member'),
});

// Monthly summary schema
export const monthlySummarySchema = z.object({
  householdId: uuidSchema,
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM
  incomesTotal: nonNegativeNumberSchema,
  expensesTotal: nonNegativeNumberSchema,
  loanPrincipalPaid: nonNegativeNumberSchema,
  loanInterestPaid: nonNegativeNumberSchema,
  loanFeesPaid: nonNegativeNumberSchema,
  loansBalance: nonNegativeNumberSchema,
  netWorth: z.number(),
});

// Export types from schemas
export type LoanCalculationInputData = z.infer<typeof loanCalculationInputSchema>;
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type PayLoanInput = z.infer<typeof payLoanSchema>;
export type EarlyRepaymentInput = z.infer<typeof earlyRepaymentSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type CreateIncomeTemplateInput = z.infer<typeof createIncomeTemplateSchema>;
export type UpdateIncomeTemplateInput = z.infer<typeof updateIncomeTemplateSchema>;
export type CreateIncomeFromTemplateInput = z.infer<typeof createIncomeFromTemplateSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetValueInput = z.infer<typeof updateAssetValueSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type InviteToHouseholdInput = z.infer<typeof inviteToHouseholdSchema>;
export type MonthlySummaryData = z.infer<typeof monthlySummarySchema>;
export type CreateAssetCashFlowInput = z.infer<typeof createAssetCashFlowSchema>;
export type UpdateAssetCashFlowInput = z.infer<typeof updateAssetCashFlowSchema>;
export type GetPortfolioOverviewInput = z.infer<typeof getPortfolioOverviewSchema>;
export type GetAssetMetricsInput = z.infer<typeof getAssetMetricsSchema>;
export type GetLoanCalendarInput = z.infer<typeof getLoanCalendarSchema>;
export type LinkLoanToAssetInput = z.infer<typeof linkLoanToAssetSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type LinkToVehicleInput = z.infer<typeof linkToVehicleSchema>;
export type GetVehiclesQueryInput = z.infer<typeof getVehiclesQuerySchema>;

