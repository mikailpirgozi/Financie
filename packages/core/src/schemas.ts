import { z } from 'zod';

// Common schemas
export const uuidSchema = z.string().uuid();
export const dateSchema = z.coerce.date();
export const positiveNumberSchema = z.number().positive();
export const nonNegativeNumberSchema = z.number().nonnegative();
export const percentageSchema = z.number().min(0).max(100);

// Loan schemas
export const loanTypeSchema = z.enum(['annuity', 'fixed_principal', 'interest_only']);
export const rateTypeSchema = z.enum(['fixed', 'variable']);
export const dayCountConventionSchema = z.enum(['30E/360', 'ACT/360', 'ACT/365']);
export const loanStatusSchema = z.enum(['active', 'paid_off', 'defaulted']);

export const createLoanSchema = z.object({
  householdId: uuidSchema,
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
});

// Asset schemas
export const assetKindSchema = z.enum(['real_estate', 'vehicle', 'business', 'loan_receivable', 'other']);

export const createAssetSchema = z.object({
  householdId: uuidSchema,
  kind: assetKindSchema,
  name: z.string().min(1).max(200),
  acquisitionValue: positiveNumberSchema,
  currentValue: positiveNumberSchema,
  acquisitionDate: dateSchema,
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
export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type PayLoanInput = z.infer<typeof payLoanSchema>;
export type EarlyRepaymentInput = z.infer<typeof earlyRepaymentSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetValueInput = z.infer<typeof updateAssetValueSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;
export type InviteToHouseholdInput = z.infer<typeof inviteToHouseholdSchema>;
export type MonthlySummaryData = z.infer<typeof monthlySummarySchema>;

