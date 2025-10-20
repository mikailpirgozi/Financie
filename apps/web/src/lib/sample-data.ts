import { createClient } from '@/lib/supabase/client';

export async function generateSampleData(householdId: string) {
  const supabase = createClient();

  try {
    // 1. Create sample categories
    const categories = [
      { name: 'Potraviny', type: 'expense', icon: '🛒', color: '#10b981' },
      { name: 'Bývanie', type: 'expense', icon: '🏠', color: '#3b82f6' },
      { name: 'Doprava', type: 'expense', icon: '🚗', color: '#f59e0b' },
      { name: 'Zábava', type: 'expense', icon: '🎬', color: '#8b5cf6' },
      { name: 'Zdravie', type: 'expense', icon: '🏥', color: '#ef4444' },
      { name: 'Plat', type: 'income', icon: '💼', color: '#06b6d4' },
      { name: 'Bonus', type: 'income', icon: '🎁', color: '#ec4899' },
    ];

    const createdCategories = [];
    for (const cat of categories) {
      const { data } = await supabase
        .from('categories')
        .insert({ ...cat, household_id: householdId })
        .select()
        .single();
      if (data) createdCategories.push(data);
    }

    // 2. Create sample loan
    const loanData = {
      household_id: householdId,
      name: 'Hypotéka na byt',
      principal: '150000',
      interest_rate: '3.5',
      term_months: 240,
      loan_type: 'annuity',
      start_date: new Date().toISOString().split('T')[0],
      status: 'active',
      day_count_convention: '30E/360',
    };

    const { data: loan } = await supabase
      .from('loans')
      .insert(loanData)
      .select()
      .single();

    // 3. Generate loan schedule
    if (loan) {
      await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loanData),
      });
    }

    // 4. Create sample expenses (last 3 months)
    const expenseCategory = createdCategories.find(c => c.type === 'expense');
    const expenses = [];
    
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      expenses.push(
        {
          household_id: householdId,
          category_id: expenseCategory?.id,
          amount: (Math.random() * 200 + 50).toFixed(2),
          description: 'Nákup potravín',
          date: date.toISOString().split('T')[0],
        },
        {
          household_id: householdId,
          category_id: expenseCategory?.id,
          amount: (Math.random() * 100 + 30).toFixed(2),
          description: 'Tankování',
          date: date.toISOString().split('T')[0],
        }
      );
    }

    await supabase.from('expenses').insert(expenses);

    // 5. Create sample incomes
    const incomeCategory = createdCategories.find(c => c.type === 'income');
    const incomes = [];
    
    for (let i = 0; i < 3; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      incomes.push({
        household_id: householdId,
        category_id: incomeCategory?.id,
        amount: '2500.00',
        description: 'Mesačný plat',
        date: date.toISOString().split('T')[0],
      });
    }

    await supabase.from('incomes').insert(incomes);

    // 6. Create sample asset
    await supabase.from('assets').insert({
      household_id: householdId,
      name: 'Byt 2+1',
      type: 'real_estate',
      purchase_price: '180000',
      purchase_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      current_value: '185000',
    });

    return { success: true };
  } catch (error) {
    console.error('Error generating sample data:', error);
    return { success: false, error };
  }
}

