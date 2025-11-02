import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const householdId = searchParams.get('householdId');

    if (!householdId) {
      return NextResponse.json({ error: 'No householdId' }, { status: 400 });
    }

    // Test direct query
    const { data: incomes, error: incomesError } = await supabase
      .from('incomes')
      .select('*')
      .eq('household_id', householdId)
      .limit(5);

    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('household_id', householdId)
      .limit(5);

    // Test RPC function
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_dashboard_data', {
      p_household_id: householdId,
      p_months_count: 3,
    });

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      householdId,
      incomes: {
        count: incomes?.length || 0,
        error: incomesError?.message,
      },
      expenses: {
        count: expenses?.length || 0,
        error: expensesError?.message,
      },
      rpcFunction: {
        success: !rpcError,
        error: rpcError?.message,
        dataLength: rpcData?.length || 0,
        data: rpcData,
      },
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

