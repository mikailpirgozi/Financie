import type { CategorizationRule } from '../types';

/**
 * Match text against categorization rules
 */
export function matchRule(text: string, rule: CategorizationRule): boolean {
  const normalizedText = text.toLowerCase().trim();
  const normalizedMatch = rule.matchValue.toLowerCase().trim();

  switch (rule.matchType) {
    case 'exact':
      return normalizedText === normalizedMatch;

    case 'contains':
      return normalizedText.includes(normalizedMatch);

    case 'starts_with':
      return normalizedText.startsWith(normalizedMatch);

    case 'ends_with':
      return normalizedText.endsWith(normalizedMatch);

    default:
      return false;
  }
}

/**
 * Find matching category for transaction
 */
export function findMatchingCategory(
  description: string,
  rules: CategorizationRule[],
  transactionType: 'expense' | 'income'
): string | null {
  // Filter rules by transaction type
  const applicableRules = rules.filter((rule) => rule.applyTo === transactionType);

  // Sort rules by priority (exact > starts_with > ends_with > contains)
  const priorityOrder = ['exact', 'starts_with', 'ends_with', 'contains'];
  const sortedRules = applicableRules.sort((a, b) => {
    return priorityOrder.indexOf(a.matchType) - priorityOrder.indexOf(b.matchType);
  });

  // Find first matching rule
  for (const rule of sortedRules) {
    if (matchRule(description, rule)) {
      return rule.categoryId;
    }
  }

  return null;
}

/**
 * Suggest categories based on common patterns
 */
export function suggestCategories(
  description: string,
  transactionType: 'expense' | 'income'
): string[] {
  const suggestions: string[] = [];
  const normalizedDesc = description.toLowerCase();

  if (transactionType === 'expense') {
    // Common expense patterns
    if (
      normalizedDesc.includes('grocery') ||
      normalizedDesc.includes('supermarket') ||
      normalizedDesc.includes('food')
    ) {
      suggestions.push('Groceries');
    }

    if (
      normalizedDesc.includes('restaurant') ||
      normalizedDesc.includes('cafe') ||
      normalizedDesc.includes('dining')
    ) {
      suggestions.push('Dining Out');
    }

    if (
      normalizedDesc.includes('gas') ||
      normalizedDesc.includes('fuel') ||
      normalizedDesc.includes('petrol')
    ) {
      suggestions.push('Transportation');
    }

    if (
      normalizedDesc.includes('rent') ||
      normalizedDesc.includes('mortgage') ||
      normalizedDesc.includes('utilities')
    ) {
      suggestions.push('Housing');
    }

    if (
      normalizedDesc.includes('doctor') ||
      normalizedDesc.includes('pharmacy') ||
      normalizedDesc.includes('medical')
    ) {
      suggestions.push('Healthcare');
    }

    if (
      normalizedDesc.includes('netflix') ||
      normalizedDesc.includes('spotify') ||
      normalizedDesc.includes('subscription')
    ) {
      suggestions.push('Entertainment');
    }
  } else {
    // Common income patterns
    if (normalizedDesc.includes('salary') || normalizedDesc.includes('wage')) {
      suggestions.push('Salary');
    }

    if (normalizedDesc.includes('bonus') || normalizedDesc.includes('commission')) {
      suggestions.push('Bonus');
    }

    if (normalizedDesc.includes('freelance') || normalizedDesc.includes('consulting')) {
      suggestions.push('Freelance');
    }

    if (normalizedDesc.includes('dividend') || normalizedDesc.includes('interest')) {
      suggestions.push('Investment Income');
    }
  }

  return suggestions;
}

/**
 * Validate categorization rule
 */
export function validateRule(rule: CategorizationRule): { valid: boolean; error?: string } {
  if (!rule.matchValue || rule.matchValue.trim().length === 0) {
    return { valid: false, error: 'Match value cannot be empty' };
  }

  if (!rule.categoryId || rule.categoryId.trim().length === 0) {
    return { valid: false, error: 'Category ID cannot be empty' };
  }

  if (!['contains', 'exact', 'starts_with', 'ends_with'].includes(rule.matchType)) {
    return { valid: false, error: 'Invalid match type' };
  }

  if (!['expense', 'income'].includes(rule.applyTo)) {
    return { valid: false, error: 'Invalid apply to value' };
  }

  return { valid: true };
}

/**
 * Test rule against sample text
 */
export function testRule(rule: CategorizationRule, testText: string): boolean {
  const validation = validateRule(rule);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  return matchRule(testText, rule);
}

/**
 * Batch categorize transactions
 */
export function batchCategorize(
  transactions: Array<{ id: string; description: string; type: 'expense' | 'income' }>,
  rules: CategorizationRule[]
): Array<{ id: string; categoryId: string | null; matched: boolean }> {
  return transactions.map((transaction) => {
    const categoryId = findMatchingCategory(transaction.description, rules, transaction.type);
    return {
      id: transaction.id,
      categoryId,
      matched: categoryId !== null,
    };
  });
}

