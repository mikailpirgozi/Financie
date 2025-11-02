import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Initialize user after authentication
 * Ensures user has a household and household_members record
 * Called by mobile app after successful login
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a household
    const { data: existing } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // User already has household
      return NextResponse.json({
        success: true,
        householdId: existing.household_id,
        message: 'User already has household',
      });
    }

    // Create default household for user
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({
        name: `${user.email?.split('@')[0] || 'Default'}'s Household`,
      })
      .select('id')
      .single();

    if (householdError || !household) {
      throw householdError || new Error('Failed to create household');
    }

    // Add user to household as owner
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      throw memberError;
    }

    // Create default categories for the household
    const defaultCategories = [
      // Expense categories
      { kind: 'expense', name: 'Potraviny' },
      { kind: 'expense', name: 'Doprava' },
      { kind: 'expense', name: 'Utilities' },
      { kind: 'expense', name: 'Zdravotnictvo' },
      { kind: 'expense', name: 'Zábava' },
      { kind: 'expense', name: 'Iné' },
      // Income categories
      { kind: 'income', name: 'Plat' },
      { kind: 'income', name: 'Bonus' },
      { kind: 'income', name: 'Iný príjem' },
      // Loan categories
      { kind: 'loan', name: 'Hypotéka' },
      { kind: 'loan', name: 'Osobný úver' },
      // Asset categories
      { kind: 'asset', name: 'Nehnuteľnosť' },
      { kind: 'asset', name: 'Vozidlo' },
      { kind: 'asset', name: 'Iný majetok' },
    ];

    await Promise.all(
      defaultCategories.map((cat) =>
        supabase.from('categories').insert({
          household_id: household.id,
          kind: cat.kind as 'expense' | 'income' | 'loan' | 'asset',
          name: cat.name,
        })
      )
    );

    return NextResponse.json({
      success: true,
      householdId: household.id,
      message: 'User initialized with new household',
    });
  } catch (error) {
    console.error('POST /api/auth/init error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
