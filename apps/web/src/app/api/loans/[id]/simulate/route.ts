import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { simulateLoanScenarios } from '@finapp/core';
import type { LoanSimulationInput } from '@finapp/core';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*')
      .eq('id', params.id)
      .single();

    if (loanError) throw loanError;
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { scenarios } = body;

    if (!scenarios || !Array.isArray(scenarios)) {
      return NextResponse.json(
        { error: 'Scenarios array is required' },
        { status: 400 }
      );
    }

    // Prepare simulation input
    const simulationInput: LoanSimulationInput = {
      loanType: loan.loan_type,
      principal: Number(loan.principal),
      annualRate: Number(loan.annual_rate),
      termMonths: loan.term_months,
      startDate: new Date(loan.start_date),
      dayCountConvention: loan.day_count_convention,
      feeSetup: Number(loan.fee_setup),
      feeMonthly: Number(loan.fee_monthly),
      insuranceMonthly: Number(loan.insurance_monthly),
      balloonAmount: loan.balloon_amount ? Number(loan.balloon_amount) : undefined,
      scenarios,
    };

    // Run simulation
    const result = simulateLoanScenarios(simulationInput);

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/loans/[id]/simulate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

